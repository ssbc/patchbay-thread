const resolve = require('mutant/resolve')
const ssbMentions = require('ssb-mentions')

function publish (opts) {
  const {
    state: {
      text,
      recps,
      publishing
    },
    beforePublish = identityCb,
    afterPublish = noop,
    patchcorePublish
  } = opts

  const content = buildContent({ text, recps })
  if (!content.text) return
  if (resolve(publishing)) return

  publishing.set(true)

  beforePublish(content, function (err, content) {
    if (err) return handleErr(err)

    patchcorePublish(content, (err, msg) => {
      publishing.set(false)
      if (err) handleErr(err)
      else if (msg) {
        text.set('')
        recps.set([])
        // textArea.value = '' // un-needed?
      }

      if (afterPublish) afterPublish(err, msg)
    })
  })

  function handleErr (err) {
    publishing.set(false)
    if (afterPublish) afterPublish(err)
    else throw err
  }
}

module.exports = publish

function buildContent ({ text, recps }) {
  return prune({
    type: 'post',
    text: resolve(text),
    recps: resolve(recps),
    mentions: getMentions(text)
  })
  // for (var k in content) { content[k] = resolve(content[k]) }
}

function getMentions (text) {
  // merge markdown-detected mention with file info
  ssbMentions(resolve(text))
    .map(mention => {
      // var file = filesById[mention.link] // TODO - private attachments
      // if (file) {
      //   if (file.type) mention.type = file.type
      //   if (file.size) mention.size = file.size
      // }
      return mention
    })
}

function prune (obj) {
  for (var k in obj) {
    const val = obj[k]

    if (val === undefined) delete obj[k]
    if (val === '') delete obj[k]
    if (Array.isArray(obj[k]) && val.length === 0) delete obj[k]
  }
  return obj
}

function noop () {
}

function identityCb (content, cb) {
  cb(null, content)
}
