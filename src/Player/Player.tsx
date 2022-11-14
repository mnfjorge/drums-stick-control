import React, { useCallback, useEffect, useState } from 'react';
import './Player.css';
import { Input, Note, Output, WebMidi } from "webmidi/dist/esm/webmidi.esm";
import { drumKit, Instruments } from "../DrumKit";
import { Hand, musicSheet } from "../MusicSheet";

function usePlayer() {
  const [isLoading, setIsLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [inputs, setInputs] = useState<Input[]>([]);
  const [outputs, setOutputs] = useState<Output[]>([]);
  const [activeInput, setActiveInput] = useState<Input | null>(null);
  const [activeOutput, setActiveOutput] = useState<Output | null>(null);
  const [note, setNote] = useState<Note | null>(new Note('F2'));

  // @ts-ignore
  window.WebMidi = WebMidi;

  useEffect(() => {
    WebMidi
      .enable()
      .then(() => {
        setMsg("WebMidi enabled!");

        setInputs(WebMidi.inputs);
        setOutputs(WebMidi.outputs);

        if (WebMidi.inputs.length === 1) {
          setActiveInput(WebMidi.inputs[0]);
        } else if (WebMidi.inputs.length === 2 && WebMidi.outputs.length === 2) {
          setActiveInput(WebMidi.inputs[0]);
          setActiveOutput(WebMidi.outputs[1]);
        }

        // Inputs
        WebMidi.inputs.forEach(input => console.log(input.manufacturer, input.name));

        // Outputs
        WebMidi.outputs.forEach(output => console.log(output.manufacturer, output.name));
      })
      .catch(err => setMsg(JSON.stringify(err)));
  }, []);

  useEffect(() => {
    if (activeInput) {
      activeInput.addListener('noteon', e => {
        console.log('noteon', e);

        switch (e.note.name + e.note.octave) {
          case 'F2':
            drumKit.playDrumNote(Instruments.HiHat);
            break;
          case 'G2':
            drumKit.playDrumNote(Instruments.Snare);
            break;
          case 'A2':
            drumKit.playDrumNote(Instruments.Kick);
            break;
          case 'B2':
            drumKit.playDrumNote(Instruments.Tom1);
            break;
          case 'C3':
            drumKit.playDrumNote(Instruments.Tom2);
            break;
          case 'D3':
            drumKit.playDrumNote(Instruments.Tom3);
            break;
        }
      });

      activeInput.addListener('noteoff', e => {
        console.log('noteoff', e);
      });
    }

    const canvas = document.getElementById('canvas');
    if (!!canvas) {
      musicSheet.draw(canvas, [
        Hand.R, Hand.L, Hand.R, Hand.L,
        Hand.R, Hand.L, Hand.R, Hand.L,
        Hand.R, Hand.L, Hand.R, Hand.L,
        Hand.R, Hand.L, Hand.R, Hand.L
      ])
    }
  }, [activeInput]);

  const captureNote = useCallback(() => {
    if (!!activeInput) {
      activeInput.addOneTimeListener(`noteon`, (e) => {
        console.log('captured note', e.note);
        setNote(new Note(e.note.name + e.note.octave));
      });
    }
  }, [activeInput, setNote]);

  return {
    isLoading,
    inputs,
    outputs,
    msg,
    setActiveInput,
    setActiveOutput,
    activeInput,
    activeOutput,
    captureNote,
    note,
  };
}

export function Player() {
  const {
    msg,
    inputs,
    outputs,
    isLoading,
    setActiveInput,
    setActiveOutput,
    activeInput,
    activeOutput,
    captureNote,
    note,
  } = usePlayer();
  const quarterNoteTempo = 100;
  const quarterNoteDuration = 1000 * 60 / quarterNoteTempo;

  function handleInputChange(e: any) {
    const inputFound = inputs.find(item => item.id === e.target.value.toString());
    if (!!inputFound) {
      setActiveInput(inputFound);
    }
  }

  function handleOutputChange(e: any) {
    const outputFound = outputs.find(item => item.id === e.target.value.toString());
    if (!!outputFound) {
      setActiveOutput(outputFound);
    }
  }

  function onTest() {
    if (activeOutput && note) {
      console.log('Playing', note.name + note.octave, 'for', quarterNoteDuration + 'ms')
      activeOutput.playNote(note, { duration: quarterNoteDuration });
    }
  }

  function setPlayNote(instrument: Instruments, shortcut: string) {
    return () => {
      console.log('playing', instrument, `shortcut: `, shortcut);
      drumKit.playDrumNote(instrument);
    };
  }

  return (
    <div>
      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <>
          <p>
            {msg}
          </p>
          <div>
            <label>
              <strong>Input</strong>
              <select name="input" onChange={handleInputChange} value={!!activeInput ? activeInput.id : ''}>
                <option value="">None</option>
                {inputs.map(input => <option key={input.id}
                                             value={input.id}>{input.name} - {input.manufacturer}</option>)}
              </select>
            </label>
            <div>
              Input selected: {!!activeInput && activeInput.name}
            </div>
            <div>Note: {JSON.stringify(note)}
              <button onClick={captureNote}>change note</button>
            </div>
          </div>
          <div>
            <label>
              <strong>Output</strong>
              <select name="output" onChange={handleOutputChange} value={!!activeOutput ? activeOutput.id : ''}>
                <option value="">None</option>
                {outputs.map(output => <option key={output.id}
                                               value={output.id}>{output.name} - {output.manufacturer}</option>)}
              </select>
            </label>
            <div>
              Output selected: {!!activeOutput && activeOutput.name}
            </div>
            {!!activeOutput && (
              <div>
                <button onClick={onTest}>Send note</button>
              </div>
            )}
          </div>
          <div>
            <button onClick={() => drumKit.init()}>init kit</button>
            <button onClick={() => drumKit.start()}>play beat</button>
            <button onClick={() => drumKit.stop()}>stop beat</button>
          </div>
          <div>
            <button onClick={setPlayNote(Instruments.HiHat, 'q')}>Hi-hat (q)</button>
            <button onClick={setPlayNote(Instruments.Snare, 'w')}>Snare (w)</button>
            <button onClick={setPlayNote(Instruments.Kick, 'e')}>Kick (e)</button>
            <button onClick={setPlayNote(Instruments.Tom1, 't')}>Tom 1 (t)</button>
            <button onClick={setPlayNote(Instruments.Tom2, 'y')}>Tom 2 (y)</button>
            <button onClick={setPlayNote(Instruments.Tom3, 'u')}>Tom 3 (u)</button>
          </div>
          <div className='led-rows' id='LED_row'>
            <img id='LED_0' src='images/LED_off.png'/>
            <img id='LED_1' src='images/LED_off.png'/>
            <img id='LED_2' src='images/LED_off.png'/>
            <img id='LED_3' src='images/LED_off.png'/>
            <img id='LED_4' src='images/LED_off.png'/>
            <img id='LED_5' src='images/LED_off.png'/>
            <img id='LED_6' src='images/LED_off.png'/>
            <img id='LED_7' src='images/LED_off.png'/>
            <img id='LED_8' src='images/LED_off.png'/>
            <img id='LED_9' src='images/LED_off.png'/>
            <img id='LED_10' src='images/LED_off.png'/>
            <img id='LED_11' src='images/LED_off.png'/>
            <img id='LED_12' src='images/LED_off.png'/>
            <img id='LED_13' src='images/LED_off.png'/>
            <img id='LED_14' src='images/LED_off.png'/>
          </div>
          <div>
            <div id='canvas'/>
          </div>
        </>
      )}
    </div>
  );
}