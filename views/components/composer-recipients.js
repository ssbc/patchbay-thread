const { h, map } = require('mutant')
const addSuggest = require('suggest-box')

const MIN_RECPS = 0

module.exports = function Recipients (opts) {
  const {
    state: { recps },
    suggest,
    avatar,
    i18n
  } = opts

  if (typeof recps !== 'function') throw new Error('ComposerRecipients requires an state.recps to be an observeable')

  return h('Recipients', [
    map(recps, recp => Recipient({ recp, avatar })),
    RecipientInput({ recps, suggest, i18n })
  ])
}

function Recipient ({ recp, avatar }) {
  if (typeof recp === 'string') { // assume it's myId
    return h('div.recp', [ avatar(recp, 'tiny') ])
  }

  return h('div.recp', [
    avatar(recp.link, 'tiny'),
    h('div.name', recp.name)
  ])
}

function RecipientInput ({ recps, suggest, i18n }) {
  const input = h('input', {
    placeholder: i18n('composer.action.addMoreRecps')
  })

  var boxActive = false
  suggestify()

  input.addEventListener('keyup', (e) => {
    // don't pop the previous entry if still entering a name!
    if (boxActive) {
      // if you delete a name you were typing completely, mark box inactive
      // so that further deletes pop names
      if (e.target.value === '') boxActive = false
      return
    }

    if (e.code === 'Backspace' || e.key === 'Backspace' || e.keyCode === 8) {
      if (recps.getLength() < MIN_RECPS) return // can only delete down to 2 recps (sender + 1 recp)

      recps.pop()
    }
  })

  return input

  function suggestify () {
    if (!input.parentElement) return setTimeout(suggestify, 100)

    addSuggest(input, (inputText, cb) => {
      if (recps.getLength() >= 7) return
      // TODO - tell the user they're only allowed 6 (or 7?!) people in a message

      boxActive = true
      const searchTerm = inputText.replace(/^@/, '')
      suggest.about(searchTerm, cb)
    }, { cls: 'PatchSuggest' }) // TODO create own style to replace patchbay PatchSuggest

    input.addEventListener('suggestselect', (e) => {
      const { id, title: name } = e.detail
      if (!recps.find(r => r === id || r.link === id)) {
        recps.push({ link: id, name })
      }

      boxActive = false
      e.target.value = ''
      e.target.placeholder = ''
    })
  }
}
