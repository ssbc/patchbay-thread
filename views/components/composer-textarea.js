const h = require('mutant/h')
const addSuggest = require('suggest-box')

module.exports = function TextArea (opts) {
  const {
    state,
    i18n,
    suggest = {},
    extraFeedIds = []
  } = opts

  if (typeof state.text !== 'function') throw new Error('ComposerTextArea requires an state.text to be an observeable')

  const textArea = h('textarea.TextArea', {
    value: state.text, // computed(text, t => t),  // CHECK - not sure why this computed was needed
    'ev-input': (ev) => state.text.set(ev.target.value),
    placeholder: i18n('composer.textarea.placeholder')
  })

  suggestify()
  return textArea

  function suggestify () {
    if (!textArea.parentElement) return setTimeout(suggestify, 100)

    suggest.about = suggest.about || noop
    suggest.channel = suggest.channel || noop
    suggest.emoji = suggest.emoji || noop

    addSuggest(textArea, (inputText, cb) => {
      const char = inputText[0]
      const wordFragment = inputText.slice(1)

      if (char === '@') suggest.about(wordFragment, extraFeedIds, cb)
      if (char === '#') suggest.channel(wordFragment, cb)
      if (char === ':') suggest.emoji(wordFragment, cb)
    }, { cls: 'PatchSuggest' }) // TODO decouple from patchbay PatchSuggest, make own style
  }
}

function noop () {}
