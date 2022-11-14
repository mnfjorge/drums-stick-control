export enum Instruments {
  Kick = 'Kick', Snare = 'Snare', HiHat = 'HiHat', Tom1 = 'Tom1', Tom2 = 'Tom2', Tom3 = 'Tom3'
}

export const INSTRUMENTS_AUDIO: { [key: string]: string; } = {
  [Instruments.Kick]: 'sounds/kick.wav',
  [Instruments.Snare]: 'sounds/snare.wav',
  [Instruments.HiHat]: 'sounds/hihat.wav',
  [Instruments.Tom1]: 'sounds/tom1.wav',
  [Instruments.Tom2]: 'sounds/tom2.wav',
  [Instruments.Tom3]: 'sounds/tom3.wav',
} as const;

const BEAT_RESET = {
  "kitIndex": 0,
  "effectIndex": 0,
  "tempo": 60,
  "swingFactor": 0.5419847328244275,
  "effectMix": 0.25,
  "kickPitchVal": 0.5,
  "snarePitchVal": 0.5,
  "hihatPitchVal": 0.5,
  "tom1PitchVal": 0.5,
  "tom2PitchVal": 0.5,
  "tom3PitchVal": 0.5,
  // [Instruments.Kick]: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
  // [Instruments.Snare]: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
  // [Instruments.HiHat]: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  // [Instruments.Tom1]: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  // [Instruments.Tom2]: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  // [Instruments.Tom3]: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  [Instruments.Kick]: [2, 2, 0, 1, 2, 2, 0, 1, 2, 2, 0, 1, 2, 2, 0, 1],
  [Instruments.Snare]: [0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 2, 0],
  [Instruments.HiHat]: [2, 1, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1],
  [Instruments.Tom1]: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [Instruments.Tom2]: [0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0],
  [Instruments.Tom3]: [1, 0, 0, 1, 0, 1, 0, 1, 1, 0, 0, 1, 1, 1, 1, 0]
};

const VOLUMES = [0, 0.3, 1];

class DrumKit {
  context: AudioContext | null = null;
  timerWorker: Worker | null = null;
  audioSamples: { [key: string]: AudioBuffer; } = {};
  startTime = 0;
  noteTime = 0.0;
  lastDrawTime = -1;
  rhythmIndex = 0;
  loopLength = 16;
  kMaxSwing = .08;
  effectDryMix = 1.0;
  effectWetMix = 1.0;
  masterGainNode: GainNode | null = null;
  convolver: ConvolverNode | null = null;
  theBeat = BEAT_RESET;

  init() {
    this.context = new AudioContext();

    let finalMixNode;
    if (this.context.createDynamicsCompressor) {
      // Create a dynamics compressor to sweeten the overall mix.
      const compressor = this.context.createDynamicsCompressor();
      compressor.connect(this.context.destination);
      finalMixNode = compressor;
    } else {
      // No compressor available in this implementation.
      finalMixNode = this.context.destination;
    }

    // create master filter node
    const filterNode = this.context.createBiquadFilter();
    filterNode.type = "lowpass";
    filterNode.frequency.value = 0.5 * this.context.sampleRate;
    filterNode.Q.value = 1;
    filterNode.connect(finalMixNode);

    // Create master volume.
    this.masterGainNode = this.context.createGain();
    this.masterGainNode.gain.value = 0.7; // reduce overall volume to avoid clipping
    this.masterGainNode.connect(filterNode);

    // Create effect volume.
    const effectLevelNode = this.context.createGain();
    effectLevelNode.gain.value = 1.0; // effect level slider controls this
    effectLevelNode.connect(this.masterGainNode);

    // Create convolver for effect
    this.convolver = this.context.createConvolver();
    this.convolver.connect(effectLevelNode);

    const timerWorkerBlob = new Blob([
      "var timeoutID=0;function schedule(){timeoutID=setTimeout(function(){postMessage('schedule'); schedule();},100);} onmessage = function(e) { if (e.data == 'start') { if (!timeoutID) schedule();} else if (e.data == 'stop') {if (timeoutID) clearTimeout(timeoutID); timeoutID=0;};}"]);

    // Obtain a blob URL reference to our worker 'file'.
    const timerWorkerBlobURL = window.URL.createObjectURL(timerWorkerBlob);

    this.timerWorker = new Worker(timerWorkerBlobURL);
    this.timerWorker.onmessage = e => {
      this.schedule();
    };
    this.timerWorker.postMessage('init'); // Start the worker.

    this.loadInstruments();

    console.log(`init finished`);
  }

  loadInstruments() {
    Object.keys(Instruments)
      .forEach((instrument) => {
        this.loadAudio(instrument as Instruments, INSTRUMENTS_AUDIO[instrument]);
      });
  }

  loadAudio(instrument: Instruments, url: string) {
    const request = new XMLHttpRequest();
    request.open("GET", url, true);
    request.responseType = "arraybuffer";

    request.onload = () => {
      if (!this.context) return;
      this.context.decodeAudioData(request.response, (decodedData: AudioBuffer) => {
        this.audioSamples[instrument] = decodedData;
        console.log(`loaded instruments`, this.audioSamples);
      }, error => {
        console.log('failure to load audio', instrument, url, error);
      });
    }

    request.send();
  }

  schedule() {
    if (!this.context) return;
    let currentTime = this.context.currentTime;

    // The sequence starts at startTime, so normalize currentTime so that it's 0 at the start of the sequence.
    currentTime -= this.startTime;

    while (this.noteTime < currentTime + 0.120) {
      // Convert noteTime to context time.
      const contextPlayTime = this.noteTime + this.startTime;

      // Kick
      if (this.theBeat[Instruments.Kick][this.rhythmIndex]) {
        this.playNote(this.audioSamples[Instruments.Kick], false, 0, 0, -2, 0.5, VOLUMES[this.theBeat[Instruments.Kick][this.rhythmIndex]], this.theBeat.kickPitchVal, contextPlayTime);
      }

      // Snare
      if (this.theBeat[Instruments.Snare][this.rhythmIndex]) {
        this.playNote(this.audioSamples[Instruments.Snare], false, 0, 0, -2, 1, VOLUMES[this.theBeat[Instruments.Snare][this.rhythmIndex]] * 0.6, this.theBeat.snarePitchVal, contextPlayTime);
      }

      // Hihat
      if (this.theBeat[Instruments.HiHat][this.rhythmIndex]) {
        this.playNote(this.audioSamples[Instruments.HiHat], true, 0.5 * this.rhythmIndex - 4, 0, -1.0, 1, VOLUMES[this.theBeat[Instruments.HiHat][this.rhythmIndex]] * 0.7, this.theBeat.hihatPitchVal, contextPlayTime);
      }

      // Toms
      if (this.theBeat[Instruments.Tom1][this.rhythmIndex]) {
        this.playNote(this.audioSamples[Instruments.Tom1], false, 0, 0, -2, 1, VOLUMES[this.theBeat[Instruments.Tom1][this.rhythmIndex]] * 0.6, this.theBeat.tom1PitchVal, contextPlayTime);
      }

      if (this.theBeat[Instruments.Tom2][this.rhythmIndex]) {
        this.playNote(this.audioSamples[Instruments.Tom2], false, 0, 0, -2, 1, VOLUMES[this.theBeat[Instruments.Tom2][this.rhythmIndex]] * 0.6, this.theBeat.tom2PitchVal, contextPlayTime);
      }

      if (this.theBeat[Instruments.Tom3][this.rhythmIndex]) {
        this.playNote(this.audioSamples[Instruments.Tom3], false, 0, 0, -2, 1, VOLUMES[this.theBeat[Instruments.Tom3][this.rhythmIndex]] * 0.6, this.theBeat.tom3PitchVal, contextPlayTime);
      }

      // Attempt to synchronize drawing time with sound
      if (this.noteTime != this.lastDrawTime) {
        this.lastDrawTime = this.noteTime;
        this.drawPlayHead((this.rhythmIndex + 15) % 16);
      }

      this.advanceNote();
    }
  }

  drawPlayHead(xIndex: number) {
    const lastIndex = xIndex === 0 ? 14 : xIndex - 1;

    const elNew = document.getElementById('LED_' + xIndex) as HTMLImageElement;
    const elOld = document.getElementById('LED_' + lastIndex) as HTMLImageElement;

    if (!!elNew && !!elOld) {
      elNew.src = 'images/LED_on.png';
      elOld.src = 'images/LED_off.png';
    }
  }

  advanceNote() {
    // Advance time by a 16th note...
    const secondsPerBeat = 60.0 / this.theBeat.tempo;

    this.rhythmIndex++;
    if (this.rhythmIndex == this.loopLength) {
      this.rhythmIndex = 0;
    }

    // apply swing
    if (this.rhythmIndex % 2) {
      this.noteTime += (0.25 + this.kMaxSwing * this.theBeat.swingFactor) * secondsPerBeat;
    } else {
      this.noteTime += (0.25 - this.kMaxSwing * this.theBeat.swingFactor) * secondsPerBeat;
    }
  }

  playNote(buffer: AudioBuffer, pan: boolean, x: number, y: number, z: number, sendGain: number, mainGain: number, playbackRate: number, noteTime: number) {
    if (!this.context || !this.masterGainNode || !this.convolver) return;

    // Create the note
    const voice = this.context.createBufferSource();
    voice.buffer = buffer;
    voice.playbackRate.value = playbackRate;

    // Optionally, connect to a panner
    let finalNode;
    if (pan) {
      const panner = this.context.createPanner();
      panner.panningModel = "HRTF";
      panner.setPosition(x, y, z);
      voice.connect(panner);
      finalNode = panner;
    } else {
      finalNode = voice;
    }

    // Connect to dry mix
    const dryGainNode = this.context.createGain();
    dryGainNode.gain.value = mainGain * this.effectDryMix;
    finalNode.connect(dryGainNode);
    dryGainNode.connect(this.masterGainNode);

    // Connect to wet mix
    const wetGainNode = this.context.createGain();
    wetGainNode.gain.value = sendGain;
    finalNode.connect(wetGainNode);
    wetGainNode.connect(this.convolver);

    voice.start(noteTime);
  }

  start() {
    if (!this.context || !this.timerWorker) return;

    this.noteTime = 0.0;
    this.startTime = this.context.currentTime + 0.005;
    this.schedule();
    this.timerWorker.postMessage("start");
  }

  stop() {
    if (!this.timerWorker) return;

    this.timerWorker.postMessage("stop");

    const elOld = document.getElementById('LED_' + (this.rhythmIndex + 14) % 16) as HTMLImageElement;

    if (!!elOld) {
      elOld.src = 'images/LED_off.png';
    }

    this.rhythmIndex = 0;
  }

  playDrumNote(instrument: Instruments) {
    switch (instrument) {
      case Instruments.Kick:
        this.playNote(this.audioSamples[instrument], false, 0, 0, -2, 0.5, VOLUMES[2], this.theBeat.kickPitchVal, 0);
        break;

      case Instruments.Snare:
        this.playNote(this.audioSamples[instrument], false, 0, 0, -2, this.theBeat.effectMix, VOLUMES[2] * 0.6, this.theBeat.snarePitchVal, 0);
        break;

      case Instruments.HiHat:
        this.playNote(this.audioSamples[instrument], true, 0.5 * this.rhythmIndex - 4, 0, -1.0, this.theBeat.effectMix, VOLUMES[2] * 0.7, this.theBeat.hihatPitchVal, 0);
        break;

      case Instruments.Tom1:
        this.playNote(this.audioSamples[instrument], false, 0, 0, -2, this.theBeat.effectMix, VOLUMES[2] * 0.6, this.theBeat.tom1PitchVal, 0);
        break;

      case Instruments.Tom2:
        this.playNote(this.audioSamples[instrument], false, 0, 0, -2, this.theBeat.effectMix, VOLUMES[2] * 0.6, this.theBeat.tom2PitchVal, 0);
        break;

      case Instruments.Tom3:
        this.playNote(this.audioSamples[instrument], false, 0, 0, -2, this.theBeat.effectMix, VOLUMES[2] * 0.6, this.theBeat.tom3PitchVal, 0);
        break;
    }
  }
}

export const drumKit = new DrumKit();