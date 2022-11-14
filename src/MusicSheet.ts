export enum Hand { N = 'N', L = 'L', R = 'R'}

class MusicSheet {
  draw(parent: HTMLElement, sheet: Hand[]) {
    parent.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'music-sheet-wrapper';
    parent.appendChild(wrapper);

    if (sheet.length != 16) {
      wrapper.innerText = 'sheet must have 16 elements';
      return;
    }

    const col1 = document.createElement('div');
    col1.className = 'music-sheet-col music-sheet-col-1';
    wrapper.appendChild(col1);

    const row1 = document.createElement('div');
    row1.className = 'music-sheet-row music-sheet-row-1';
    col1.appendChild(row1);
    const row2 = document.createElement('div');
    row2.className = 'music-sheet-row music-sheet-row-2';
    col1.appendChild(row2);
    const row3 = document.createElement('div');
    row3.className = 'music-sheet-row music-sheet-row-3';
    col1.appendChild(row3);
    const row4 = document.createElement('div');
    row4.className = 'music-sheet-row music-sheet-row-4';
    col1.appendChild(row4);
    const footer1 = document.createElement('div');
    footer1.className = 'music-sheet-footer music-sheet-footer-1';
    col1.appendChild(footer1);

    const col2 = document.createElement('div');
    col2.className = 'music-sheet-col music-sheet-col-2';
    wrapper.appendChild(col2);

    const row12 = document.createElement('div');
    row12.className = 'music-sheet-row music-sheet-row-1';
    col2.appendChild(row12);
    const row22 = document.createElement('div');
    row22.className = 'music-sheet-row music-sheet-row-2';
    col2.appendChild(row22);
    const row32 = document.createElement('div');
    row32.className = 'music-sheet-row music-sheet-row-3';
    col2.appendChild(row32);
    const row42 = document.createElement('div');
    row42.className = 'music-sheet-row music-sheet-row-4';
    col2.appendChild(row42);
    const footer2 = document.createElement('div');
    footer2.className = 'music-sheet-footer music-sheet-footer-2';
    col2.appendChild(footer2);

    sheet.forEach((hand, idx) => {
      const note = document.createElement('div');
      note.className = `music-sheet-note music-sheet-note-${idx} music-sheet-note-${hand}`;

      const label = document.createElement('div');
      label.className = `music-sheet-label music-sheet-label-${idx} music-sheet-label-${hand}`;
      label.innerHTML = hand != Hand.N ? hand : '';

      if (idx < 8) {
        row2.appendChild(note);
        footer1.appendChild(label);
      } else {
        row22.appendChild(note);
        footer2.appendChild(label);
      }
    });
  }
}

export const musicSheet = new MusicSheet();