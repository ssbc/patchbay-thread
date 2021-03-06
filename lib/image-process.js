const { resolve } = require('mutant')
const piexif = require('piexifjs')

// NOTE this processes images AND converts doc.data into a blob

module.exports = function imageProcess (opts) {
  const { stripExif, resize } = opts

  return function (doc, cb) {
    var orientation = 0
    if (doc.mimeType === 'image/jpeg') {
      try {
        orientation = getOrientation(doc.data)
        if (resolve(stripExif) === 'true') doc.data = removeExif(doc.data, orientation)
      } catch (ex) {
        console.log('exif exception:', ex)
      }
    }

    // handle exif orientation data and resize
    if (orientation >= 3 || resize) {
      getImage(doc.data, (image) => {
        image = rotate(image, orientation)
        if (resize) {
          image = doResize(image, resize.width, resize.height)
        }
        if (image.toBlob) {
          if (doc.mimeType !== 'image/jpeg' && doc.mimeType !== 'image/png') {
            doc.mimeType = 'image/jpeg'
          }
          image.toBlob(blob => {
            doc.data = blob
            cb(null, doc)
          }, doc.mimeType, 0.85)
        } else {
          doc.data = dataURItoBlob(doc.data)
          cb(null, doc)
        }
      })
    } else {
      // don't process
      doc.data = dataURItoBlob(doc.data)
      cb(null, doc)
    }
  }
}

function dataURItoBlob (dataURI) {
  var byteString = window.atob(dataURI.split(',')[1])
  var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0]
  var ab = new ArrayBuffer(byteString.length)
  var ia = new Uint8Array(ab)
  for (var i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i)
  }
  return new window.Blob([ab], { type: mimeString })
}

function getImage (data, cb) {
  var image = document.createElement('img')
  image.onload = () => cb(image)
  image.src = data
  image.style.display = 'block'
  if (image.complete) cb(image)
}

function doResize (image, width, height) {
  var imageHeight = image.height
  var imageWidth = image.width

  var multiplier = (height / image.height)
  if (multiplier * imageWidth < width) {
    multiplier = width / image.width
  }

  var finalWidth = imageWidth * multiplier
  var finalHeight = imageHeight * multiplier

  var offsetX = (finalWidth - width) / 2
  var offsetY = (finalHeight - height) / 2

  var canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  var ctx = canvas.getContext('2d')
  ctx.drawImage(image, -offsetX, -offsetY, finalWidth, finalHeight)
  return canvas
}

function removeExif (fileData, orientation) {
  var clean = piexif.remove(fileData)
  if (orientation !== undefined) { // preserve
    var exifData = { '0th': {} }
    exifData['0th'][piexif.ImageIFD.Orientation] = orientation
    var exifStr = piexif.dump(exifData)
    return piexif.insert(exifStr, clean)
  } else {
    return clean
  }
}

function getOrientation (fileData) {
  var exif = piexif.load(fileData)
  return exif['0th'][piexif.ImageIFD.Orientation]
}

function rotate (img, orientation) {
  var canvas = document.createElement('canvas')
  var ctx = canvas.getContext('2d')

  if (orientation === 6 || orientation === 8) {
    canvas.width = img.height
    canvas.height = img.width
    ctx.translate(img.height / 2, img.width / 2)
    if (orientation === 6) {
      ctx.rotate(0.5 * Math.PI)
    } else {
      ctx.rotate(1.5 * Math.PI)
    }
  } else if (orientation === 3) {
    canvas.width = img.width
    canvas.height = img.height
    ctx.translate(img.width / 2, img.height / 2)
    ctx.rotate(1 * Math.PI)
  } else {
    return img
  }

  ctx.drawImage(img, -img.width / 2, -img.height / 2)
  return canvas
}
