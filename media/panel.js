(function () {
  const transcript = document.getElementById('transcript');
  const status = document.getElementById('status');
  const stopBtn = document.getElementById('stopBtn');

  /** @type {Record<string, HTMLElement | null>} */
  const streamingLine = { A: null, B: null };

  function ensureSpeakerBlock(speaker) {
    const block = document.createElement('div');
    block.className = `block speaker-${speaker}`;

    const label = document.createElement('div');
    label.className = 'label';
    label.textContent = speaker;

    const body = document.createElement('pre');
    body.className = 'body';

    block.appendChild(label);
    block.appendChild(body);
    transcript.appendChild(block);
    transcript.scrollTop = transcript.scrollHeight;

    return body;
  }

  function appendMessage(speaker, text) {
    if (speaker === 'A' || speaker === 'B') {
      if (streamingLine[speaker]) {
        streamingLine[speaker].textContent = text;
        streamingLine[speaker] = null;
        transcript.scrollTop = transcript.scrollHeight;
        return;
      }
    }

    const body = ensureSpeakerBlock(speaker);
    body.textContent = text;
    streamingLine.A = null;
    streamingLine.B = null;
  }

  function appendChunk(speaker, text) {
    if (!streamingLine[speaker]) {
      streamingLine[speaker] = ensureSpeakerBlock(speaker);
      streamingLine[speaker].textContent = '';
    }
    streamingLine[speaker].textContent += text;
    transcript.scrollTop = transcript.scrollHeight;
  }

  window.addEventListener('message', (event) => {
    const msg = event.data;

    if (!msg || !msg.type) return;

    if (msg.type === 'status') {
      status.textContent = msg.text || '';
      return;
    }

    if (msg.type === 'message') {
      appendMessage(msg.speaker, msg.text || '');
      return;
    }

    if (msg.type === 'chunk') {
      appendChunk(msg.speaker, msg.text || '');
      return;
    }
  });

  stopBtn.addEventListener('click', () => {
    vscode.postMessage({ type: 'stop' });
  });
})();
