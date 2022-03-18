import React, { useCallback, useState, useRef } from "react";
import Script from "next/script";
import EventEmitter from "events";
import WaveformPlaylist from "waveform-playlist";
import { saveAs } from "file-saver";

import 'waveform-playlist/styles/playlist.scss';

import '../daw/style.css'
import '../daw/responsive.css'

// For extra buttons.
import 'bootstrap/dist/css/bootstrap.min.css';

import DawVideoPreview from './DawVideoPreview'
import DawTrackDrop from "./DawTrackDrop";
import DawControl from "./DawControl";

// See source code of this example:
// https://naomiaro.github.io/waveform-playlist/web-audio-editor.html

let userMediaStream;
let playlist = {}; // To be filled later.
let constraints = { audio: true };

navigator.getUserMedia = (navigator.getUserMedia ||
  navigator.webkitGetUserMedia ||
  navigator.mozGetUserMedia ||
  navigator.msGetUserMedia);

function gotStream(stream) {
  userMediaStream = stream;
  playlist.initRecorder(userMediaStream);
  document.getElementById("btn-record").classList.remove("disabled")
}

function logError(err) {
  console.error(err);
}

// See this exmample:
// https://github.com/naomiaro/waveform-playlist/blob/main/examples/basic-nextjs/pages/index.js
export default function Daw({ playerInstance }) {
  const [ee] = useState(new EventEmitter());
  const [toneCtx, setToneCtx] = useState(null);
  const setUpChain = useRef();

  // Disable & enable the trim button.
  const [trimDisabled, setTrimDisabled] = useState(true);
  function updateSelect(start, end) {
    if (start < end) {
      setTrimDisabled(false);
    }
    else {
      setTrimDisabled(true);
    }
  }

  let audioPos = 0;
  function updateTime(time) {
    audioPos = time;
  }

  const container = useCallback(
    (node) => {
      if (node !== null && toneCtx !== null) {
        playlist = WaveformPlaylist(
          {
            ac: toneCtx.rawContext,
            samplesPerPixel: 3000,
            mono: true,
            waveHeight: 138,
            container: node,
            state: "cursor",
            colors: {
              waveOutlineColor: "#E0EFF1",
              timeColor: "grey",
              fadeColor: "black",
            },
            timescale: true,
            controls: {
              show: true,
              width: 150,
            },
            barWidth: 3, // width in pixels of waveform bars.
            barGap: 1, // spacing in pixels between waveform bars.
            seekStyle: 'line',
            zoomLevels: [500, 1000, 3000, 5000],
          },
          ee
        );

        ee.on("audiorenderingstarting", function (offlineCtx, a) {
          // Set Tone offline to render effects properly.
          const offlineContext = new Tone.OfflineContext(offlineCtx);
          Tone.setContext(offlineContext);
          setUpChain.current = a;
        });

        ee.on("audiorenderingfinished", function (type, data) {
          //restore original ctx for further use.
          Tone.setContext(toneCtx);
          if (type === "wav") {
            saveAs(data, "test.wav");
          }
        });

        ee.on("select", updateSelect);
        ee.on("timeupdate", updateTime);

        playlist.load([
          // Empty. Don't load any audio for now.
        ]).then(function () {
          // can do stuff with the playlist.

          // After you create the playlist you have to call this function if you want to use recording:
          //initialize the WAV exporter.
          playlist.initExporter();

          if (navigator.mediaDevices) {
            navigator.mediaDevices.getUserMedia(constraints)
              .then(gotStream)
              .catch(logError);
          } else if (navigator.getUserMedia && 'MediaRecorder' in window) {
            navigator.getUserMedia(
              constraints,
              gotStream,
              logError
            );
          }
        });

      }
    },
    [ee, toneCtx]
  );

  function handleLoad() {
    setToneCtx(Tone.getContext());
  }

  return (
    <>
      <Script
        src="https://kit.fontawesome.com/ef69927139.js"
        crossorigin="anonymous"
      />
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/tone/14.8.37/Tone.js"
        onLoad={handleLoad}
      />
      <main className="daw-container-inner">
        <div className="daw-top-row">
          <DawControl playerInstance={playerInstance} ee={ee} trimDisabled={trimDisabled}></DawControl>
          <div className="video-preview-outer">
            <DawVideoPreview playerInstance={playerInstance}></DawVideoPreview>
          </div>
        </div>
        <div ref={container}></div>
        <DawTrackDrop ee={ee}></DawTrackDrop>
      </main>
    </>
  );
}
