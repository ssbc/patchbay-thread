const { h, resolve } = require('mutant')
const pull = Object.assign(require('pull-stream'), {
  boxStream: require('pull-box-stream'),
  addBlob: require('../../lib/pull-add-blob')
})
const mime = require('simple-mime')('application/octect-stream')
const split = require('split-buffer')

const imageProcess = require('../../lib/image-process')

module.exports = function FileInput ({ server, afterAttach, opts = {} }) {
  const {
    accept,
    stripExif = false, // Boolean (or obs)
    resize, // { width, height}
    isPrivate
  } = opts

  return h('input', {
    type: 'file',
    accept,
    attributes: { multiple: true },
    'ev-change': AttachFiles
  })

  function AttachFiles (ev) {
    var files = ev.target.files
    if (!files.length) return

    pull(
      pull.values(files), // TODO generalize to files later!
      pull.asyncMap(buildFileDoc),
      pull.asyncMap(imageProcess({ stripExif, resize })), // NOTE this also blobifies the data
      pull.drain(
        (doc) => AttachFile(doc, ev),
        (err) => {
          if (err) console.error(err)
        }
      )
    )
  }

  function AttachFile (doc, ev) {
    const { name, mimeType, data } = doc
    var reader = new global.FileReader()
    reader.onload = function () {
      // TODO bail out and run onError(?) if size > 5MB
      pull(
        pull.values(split(new Buffer(reader.result), 64 * 1024)),
        pull.addBlob({ server, encrypt: resolve(isPrivate) }, (err, blobId) => {
          if (err) return console.error(err)

          afterAttach({
            link: blobId,
            name,
            size: reader.result.length || reader.result.byteLength,
            type: mimeType
          })

          ev.target.value = ''
        })
      )
    }
    reader.readAsArrayBuffer(data)
  }
}

function buildFileDoc (file, cb) {
  const reader = new global.FileReader()
  reader.onload = function (e) {
    cb(null, {
      name: file.name,
      mimeType: mime(file.name),
      data: e.target.result
    })
  }
  reader.readAsDataURL(file)
}
