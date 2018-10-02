const { h, resolve, computed, Value, Struct, Array: MutantArray } = require('mutant')
const { isFeed } = require('ssb-ref')

const Recipients = require('./components/composer-recipients')
const TextArea = require('./components/composer-textarea')
const publish = require('./components/composer-publish')

module.exports = function Composer (opts, afterPublish) {
  const {
    initialRecps = [],
    myKey,
    initialText = '',
    suggest,
    extraFeedIds = [],
    beforePublish,
    i18n = identity,
    avatar = identity,
    patchcorePublish,
    onCancel = noop
  } = opts

  const state = Struct({
    text: Value(resolve(initialText)),
    recps: MutantArray(buildRecps(initialRecps, myKey)),
    publishing: Value(false)
  })

  const textArea = TextArea({ state, i18n, suggest, extraFeedIds })
  textArea.publish = handlePublish // crude external API

  const oneWayAlertClass = computed(state.recps, recps => recps.some(isMe) ? '-hidden' : '')

  return h('Composer', [
    h('section.recps', [
      h('label.recps', i18n('composer.label.recipients')),
      Recipients({ state, suggest, avatar, i18n })
    ]),
    h('section.one-way', { className: oneWayAlertClass }, [
      h('label.recps', ''),
      h('div.alert', i18n('composer.alert.one-way'))
    ]),
    // TODO subject field
    // h('div.field -subject', [
    //   h('div.label', i18n('threadNew.field.subject')),
    //   h('input', {
    //     'ev-input': e => meta.subject.set(e.target.value),
    //     placeholder: i18n('optionalField')
    //   })
    // ]),
    h('section.textArea', [
      h('label.textArea', i18n('composer.label.textArea')),
      textArea
    ]),
    // TODO preview
    // h('section.preview', [
    //   preview,
    // ]),
    h('section.actions', [
      h('label.actions', ''),
      h('div.actions', [
        h('button.-subtle',
          { 'ev-click': handleCancel },
          i18n('composer.action.cancel')
        ),
        h('button -primary',
          { disabled: state.publishing, 'ev-click': handlePublish },
          i18n('composer.action.publish')
        )
      ])
    ])
  ])

  function handlePublish () {
    publish({ state, beforePublish, afterPublish, patchcorePublish })
  }

  function handleCancel () {
    state.set(resolve(initialText))
    state.recps.set(buildRecps(initialRecps, myKey))
    state.publishing.set(false)
    onCancel()
  }

  function isMe (recp) {
    return recp === myKey || recp.link === myKey
  }

  function buildRecps (initialRecps, myKey) {
    if (!isFeed(myKey)) throw new Error('Composer requires myKey to be a valid feedId')

    const otherFeeds = resolve(initialRecps)
      .filter(recp => isFeed(recp.link))
      .filter(recp => !isMe(recp))

    return [myKey, ...otherFeeds]
  }
}

function identity (t) { return t }
function noop () {}
