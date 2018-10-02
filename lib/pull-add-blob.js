const pull = Object.assign(require('pull-stream'), {
  defer: require('pull-defer')
})
const { onceTrue } = require('mutant')
const crypto = require('crypto')
const zeros = Buffer.alloc(24, 0)

module.exports = function AddBlob ({ server, encrypt = false }, cb) {
  var sink = pull.defer.sink()

  onceTrue(server, sbot => {
    if (!encrypt) {
      sink.resolve(sbot.blobs.add(cb))
      return
    }

    // FROM: https://github.com/ssbc/ssb-secret-blob/blob/master/index.js
    // here we need to hash something twice, first, hash the plain text to use as the
    // key. This has the benefit of encrypting deterministically - the same file will
    // have the same hash. This can be used to deduplicate storage, but has privacy
    // implications. I do it here just because it's early days and this makes testing
    // easier.

    sink.resolve(Hash(function (err, buffers, key) {
      if (err) return cb(err)
      pull(
        pull.once(Buffer.concat(buffers)),
        pull.boxStream.createBoxStream(key, zeros),
        Hash(function (err, buffers, hash) {
          if (err) return cb(err)
          var id = '&' + hash.toString('base64') + '.sha256'

          pull(
            pull.values(buffers),
            sbot.blobs.add(id, function (err) {
              if (err) return cb(err)

              sbot.blobs.push(id, function (err) {
                if (err) return cb(err)

                cb(null, id + '?unbox=' + key.toString('base64') + '.boxs')
              })
            })
          )
        })
      )
    }))
  })

  return sink
}

function Hash (cb) {
  var hash = crypto.createHash('sha256')
  var buffers = []

  return pull.drain(
    data => {
      data = typeof data === 'string' ? new Buffer(data) : data
      buffers.push(data)
      hash.update(data)
    },
    err => cb(err, buffers, hash.digest())
  )
}
