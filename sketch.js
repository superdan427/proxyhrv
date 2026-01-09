let solo = [];
let group = [];

let startTime = 0;
let duration = 0;

const MAX_HRV = 10;     // 6–8 explain
const PADDING = 100;

let speedSlider;

async function setup() {
  solo = Object.values(await loadJSON("solo.json"));
  group = Object.values(await loadJSON("group.json"));

  duration = findDuration(solo, group);

  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);

  // speed slider
  speedSlider = createSlider(0.1, 4, 1, 0.1);
  speedSlider.position(20, height - 40);
  speedSlider.style("width", "200px");

  startTime = millis();
}

function draw() {
  background(255);

  let speed = speedSlider.value();
  let elapsed = floor(((millis() - startTime) / 1000) * speed);

  // reset at the end
  if (elapsed >= duration) {
    startTime = millis();
    return;
  }

  // timestamp at top
  let mm = nf(floor(elapsed / 60), 2);
  let ss = nf(elapsed % 60, 2);
  let timestampString = `${mm}:${ss}`;

  fill(0);
  textAlign(CENTER, TOP);
  textSize(18);
  text(timestampString, width / 2, 20);

  drawAxes();
  drawVerticalCursor(elapsed);

  drawHRVLine(solo, elapsed, 210); // blue
  drawHRVLine(group, elapsed, 0);  // red

  drawSpeedLabel();
}


// ------------------------------------------------------------
// HRV PROXY = | BPM(t) − BPM(t−1) |
// ------------------------------------------------------------

function getHRVProxy(data, sec) {
  let now = getBPMAtSecond(data, sec);
  let prev = getBPMAtSecond(data, sec - 1);

  if (now === null || prev === null) return 0;
  return abs(now - prev);
}


// ------------------------------------------------------------
// DRAW HRV LINE
// ------------------------------------------------------------

function drawHRVLine(data, elapsed, hueVal) {
  strokeWeight(3);

  // blinking/glow based on stress amplitude
  let glowPhase = abs(sin(millis() / 200));
  let glow = map(glowPhase, 0, 1, 40, 100);

  stroke(hueVal, 80, glow);
  noFill();

  beginShape();
  for (let i = 1; i <= elapsed; i++) {
    let hrv = getHRVProxy(data, i);
    hrv = constrain(hrv, 0, MAX_HRV);

    let x = map(i, 0, duration, PADDING, width - PADDING);
    let y = map(hrv, 0, MAX_HRV, height - PADDING, PADDING);

    vertex(x, y);
  }
  endShape();
}

function drawAxes() {
  stroke(0);
  strokeWeight(1);

  // X
  line(PADDING, height - PADDING, width - PADDING, height - PADDING);

  // Y
  for (let v = 0; v <= MAX_HRV; v += 2) {
    let y = map(v, 0, MAX_HRV, height - PADDING, PADDING);
    stroke(180);
    line(PADDING - 5, y, PADDING + 5, y);

    noStroke();
    fill(0);
    textAlign(RIGHT, CENTER);
    text(v, PADDING - 15, y);
  }

  // 5sec
  textAlign(CENTER, TOP);
  textSize(16);
  fill(0);

  for (let t = 0; t <= duration; t += 5) {
    let x = map(t, 0, duration, PADDING, width - PADDING);

    stroke(180);
    line(x, height - PADDING - 6, x, height - PADDING + 6);

    noStroke();
    let label = nf(floor(t / 60), 2) + ":" + nf(t % 60, 2);
    text(label, x, height - PADDING + 10);
  }

  textAlign(CENTER, CENTER);
  text("Time →", width / 2, height - PADDING + 40);
}




function drawVerticalCursor(elapsed) {
  let x = map(elapsed, 0, duration, PADDING, width - PADDING);

  stroke(0, 0, 60);
  strokeWeight(2);
  line(x, PADDING, x, height - PADDING);
}




function getBPMAtSecond(data, sec) {
  let bpm = null;
  for (let d of data) {
    if (d.bpm !== null && tsToSec(d.time) <= sec) bpm = d.bpm;
  }
  return bpm;
}

function tsToSec(ts) {
  let [m, s] = ts.split(":").map(Number);
  return m * 60 + s;
}

function findDuration(solo, group) {
  let lastSec = 0;

  for (let e of solo)
    if (e.bpm !== null)
      lastSec = max(lastSec, tsToSec(e.time));

  for (let e of group)
    if (e.bpm !== null)
      lastSec = max(lastSec, tsToSec(e.time));

  return lastSec;
}



function drawSpeedLabel() {
  fill(0);
  noStroke();
  textAlign(LEFT, CENTER);
  textSize(18);
  text("Speed", 20, height - 60);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  speedSlider.position(20, height - 40);
}
