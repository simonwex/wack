
var SEQUENCE = ['leftWrist', 'leftElbow', 'leftShoulder', 'rightShoulder', 'rightElbow', 'rightWrist'];/*,
'leftHip',
'rightHip',
'leftKnee',
'rightKnee',
'leftAnkle','rightAnkle'];
*/
var video = document.querySelector('#webcam');
var canvas = document.querySelector('#canvas');
var captureCanvas = document.createElement('canvas');
var preContent = document.querySelector('#pre');
var startButton = document.querySelector('#start');
var ctx = canvas.getContext('2d');
var captureCtx = captureCanvas.getContext('2d');

var step = Tone.Time('4n').toSeconds();
var measure = Tone.Time('1m').toSeconds();
var loopDuration = measure * 2;
var scale = [1, 2, 2, 2, 1, 2, 2];
var rootNote = Tone.Frequency('E2').toMidi();
var gamut = 10;
var humanize = 0.025;

var delay = new Tone.PingPongDelay(step * 3 / 4, 0.5).toMaster();
var sampler = new Tone.Sampler({
  C2: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/969699/pure-bell-c2.mp3',
  'D#2': 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/969699/pure-bell-ds2.mp3',
  'F#2': 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/969699/pure-bell-fs2.mp3',
  A2: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/969699/pure-bell-a2.mp3',
  C3: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/969699/pure-bell-c3.mp3',
  'D#3': 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/969699/pure-bell-ds3.mp3',
  'F#3': 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/969699/pure-bell-fs3.mp3',
  A3: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/969699/pure-bell-a3.mp3'
}).connect(delay).toMaster();
sampler.release.value = 2;

var netPromise = posenet.load();
var buffersPromise = new Promise(function (res) {
  return Tone.Buffer.on('load', res);
});

var points = void 0,
    notesOn = void 0,
    startTime = void 0,
    notesPlayed = _.times(loopDuration / step, function () {
  return _.times(gamut, function () {
    return 0;
  });
});


function detectPose(net, scaleFactor) {
  captureCtx.drawImage(video, 0, 0);
  net.estimateSinglePose(captureCanvas, scaleFactor, true, 32).then(function (pose) {
    points = SEQUENCE.map(function (part) {
      return _.find(pose.keypoints, { part: part });
    }).filter(_.identity);
    var steps = loopDuration / step;
    var noteWidth = video.videoWidth / steps;
    var noteHeight = video.videoHeight / gamut;

    notesOn = [];
  });
  setTimeout(function () {
    return detectPose(net, scaleFactor);
  }, step / 4 * 1000);
}

function getOffshootPoint(_ref, _ref2) {
  var _ref$position = _ref.position,
      x1 = _ref$position.x,
      y1 = _ref$position.y;
  var _ref2$position = _ref2.position,
      x2 = _ref2$position.x,
      y2 = _ref2$position.y;

  if (x1 === x2 && y1 === y2) {
    return [x1, y1];
  } else if (x1 === x2) {
    var ySign = (y2 - y1) / Math.abs(y2 - y1);
    return [x1, ySign * 1000];
  } else if (y1 === y2) {
    var xSign = (x2 - x1) / Math.abs(x2 - x1);
    return [xSign * 1000, y1];
  } else {
    var _xSign = (x2 - x1) / Math.abs(x2 - x1);
    var _ySign = (y2 - y1) / Math.abs(y2 - y1);
    var slope = (y2 - y1) / (x2 - x1);
    var x = x1 - _xSign * 1000 * Math.sqrt(1 / (1 + Math.pow(slope, 2)));
    var y = y1 - _xSign * slope * 1000 * Math.sqrt(1 / (1 + Math.pow(slope, 2)));
    return [x, y];
  }
}

function easeOutQuad(x) {
  return x * x;
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate((canvas.width - 513) / 2, (canvas.height - 513) / 2);

  if (points) {
    ctx.strokeStyle = 'rgba(3, 169, 244, 0.75)';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.beginPath();

    if (points.length >= 2) {
      let [preX, preY] = getOffshootPoint(points[0], points[1]);
      ctx.moveTo(preX, preY);
    }
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = points[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var point = _step.value;

        ctx.lineTo(point.position.x, point.position.y);
      }
      if (points.length >= 2) {
        let [postX, postY] = getOffshootPoint(
          points[points.length - 1],
          points[points.length - 2]
        );
        ctx.lineTo(postX, postY);
      }
    } catch (err) {
      _didIteratorError = true;
      _iteratorError = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion && _iterator.return) {
          _iterator.return();
        }
      } finally {
        if (_didIteratorError) {
          throw _iteratorError;
        }
      }
    }

    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';

  if (startTime) {
    var steps = loopDuration / step;
    var noteWidth = video.videoWidth / steps;
    var noteHeight = video.videoHeight / gamut;

    var playedFor = Tone.now() - startTime - step;
    var loopsGone = Math.floor(playedFor / loopDuration);
    var fraction = (playedFor - loopsGone * loopDuration) / loopDuration;

    var currentNote = Math.floor(fraction * steps);

    // ctx.fillRect(currentNote * noteWidth, 0, noteWidth, video.videoHeight);

    var radius = Math.min(noteWidth, noteHeight);
    for (var i = 0; i < gamut; i++) {
      var y = (i + 1 / 2) * noteHeight;
      
      for (var j = 0; j < steps; j++) {
        var playedAt = notesPlayed[j][i];
        if (playedAt <= Tone.now() && playedAt > Tone.now() - 1) {
          var alpha = 1 - (Tone.now() - playedAt);
          ctx.fillStyle = 'rgba(255, 255, 255, ' + alpha + ')';
          var x = (j + 1 / 2) * noteWidth;
          ctx.beginPath();
          ctx.arc(x, y, radius * easeOutQuad(1 - alpha), 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
  ctx.restore();
  requestAnimationFrame(render);
}

startButton.addEventListener('click', function () {
  preContent.remove();
  video.width = 513;
  video.height = 513;

  navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { width: 513, height: 513, facingMode: 'user' }
  }).then(function (stream) {
    video.srcObject = stream;
    video.addEventListener('playing', function () {
      var scaleFactor = Math.min(1.0, Math.max(0.2, video.videoWidth / 513 * 0.5));

      captureCanvas.width = video.videoWidth;
      captureCanvas.height = video.videoHeight;
      captureCanvas.style.width = video.videoWidth + 'px';
      captureCanvas.style.height = video.videoHeight + 'px';
      netPromise.then(function (net) {
        return detectPose(net, scaleFactor);
      });

      var synth = new Tone.Synth().toMaster(),
          nextPlay = Tone.now() + step;
      startTime = nextPlay;



      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      window.addEventListener('resize', function () {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
      });
      
      render();
    });
  }).catch(function (e) {
    return console.error(e);
  });
});

Promise.all([netPromise, buffersPromise]).then(function () {
  startButton.textContent = 'Start';
  startButton.disabled = false;
});


