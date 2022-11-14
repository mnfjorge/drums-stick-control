class IntensityTracker {
  records: number[] = [];
  wrapper: HTMLElement | null = null;
  max: number = 0;

  init(parent: HTMLElement) {
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'intensity-tracker';
    parent.innerHTML = '';
    parent.appendChild(this.wrapper);
  }

  append(intensity: number) {
    this.records.push(intensity);

    this.draw();
  }

  draw() {
    if (!this.wrapper || this.records.length === 0) return;
    this.wrapper.innerHTML = '';
    const parent = this.wrapper;

    this.records = this.records.slice(-10);

    const sorted = [...this.records];
    sorted.sort((a, b) => a - b);

    this.max = sorted[sorted.length - 1];

    this.records.forEach((item) => {
      const bar = document.createElement('div');
      bar.className = 'intensity-tracker-bar';
      bar.style.height = `${Math.round(item * 100 / this.max)}%`;
      parent.appendChild(bar);
    });
  }
}

export const intensityTracker = new IntensityTracker();