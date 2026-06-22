/* ============================================================
   알고리즘·자료구조, 눈으로 보기 — 공통 헬퍼 (전역 VZ).
   코어 + linePlot + VZ.LA(arrow/tween) + VZ.AL(algorithms).
   모든 과정은 페이지에서 실시간 계산·기록·재생. 외부 출처 인용 없음.
   ============================================================ */
(function (global) {
  'use strict';

  const fmt = (n, d = 2) => {
    if (!isFinite(n)) return n > 0 ? '∞' : '−∞';
    const r = Number(n).toFixed(d);
    return Object.is(parseFloat(r), -0) ? (0).toFixed(d) : r;
  };
  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
  const PALETTE = ['#60a5fa', '#fbbf24', '#94a3b8', '#34d399', '#f472b6', '#c084fc', '#fb7185', '#37bdf8'];

  function setupStepper(stepperSel = '#stepper', panelSel = '[data-panel]') {
    const stepper = document.querySelector(stepperSel);
    if (!stepper) return;
    const panels = [...document.querySelectorAll(panelSel)];
    stepper.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      const s = b.dataset.s;
      stepper.querySelectorAll('button').forEach(x => x.classList.toggle('active', x === b));
      panels.forEach(p => p.classList.toggle('show', p.dataset.panel === s));
      const top = stepper.getBoundingClientRect().top + window.scrollY - 10;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  }

  function setupViewToggle(toggleSel, views, onShow) {
    const toggle = document.querySelector(toggleSel);
    if (!toggle) return;
    const shown = {};
    toggle.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      const v = b.dataset.v;
      toggle.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
      if (onShow && !shown[v]) { onShow(v); shown[v] = true; }
      Object.keys(views).forEach(key => {
        const el = document.querySelector(views[key]);
        if (el) el.style.display = (key === v) ? '' : 'none';
      });
    });
  }

  function mountTopnav(sel, badge) {
    const el = document.querySelector(sel);
    if (!el) return;
    el.innerHTML = `<a class="home" href="index.html">← 목차로</a><span class="chapbadge">${badge}</span>`;
  }

  function barRow(label, frac, { win = false, color = null, pctText = null } = {}) {
    const c = color || (win ? 'var(--hot)' : 'var(--q)');
    return `<div class="barrow ${win ? 'win' : ''}">
      <div class="bw">${label}${win ? ' 🏆' : ''}</div>
      <div class="track"><div class="fill" style="width:${(clamp(frac, 0, 1) * 100).toFixed(1)}%;background:${c}"></div></div>
      <div class="pct">${pctText != null ? pctText : (frac * 100).toFixed(1) + '%'}</div>
    </div>`;
  }

  global.VZ = { fmt, clamp, PALETTE, setupStepper, setupViewToggle, mountTopnav, barRow };
})(window);

/* ============================================================
   꺾은선 차트 (VZ.linePlot) — 수렴/손실/1변수 곡선용
   series:[{pts:[[x,y]],color,label,dash}], opts:{W,H,xlab,ylab,xmin..ymax,legend,hline,aria}
   ============================================================ */
(function (global) {
  'use strict';
  const VZ = global.VZ;
  function linePlot(series, opts = {}) {
    const W = opts.W || 460, H = opts.H || 230, padL = 44, padR = 14, padT = opts.legend === false ? 14 : 30, padB = 34;
    const all = series.filter(s => s.pts && s.pts.length);
    let xmin = opts.xmin, xmax = opts.xmax, ymin = opts.ymin, ymax = opts.ymax;
    if (xmin == null) xmin = Math.min(...all.flatMap(s => s.pts.map(p => p[0])), 0);
    if (xmax == null) xmax = Math.max(...all.flatMap(s => s.pts.map(p => p[0])), 1);
    if (ymin == null) ymin = Math.min(...all.flatMap(s => s.pts.map(p => p[1])), 0);
    if (ymax == null) ymax = Math.max(...all.flatMap(s => s.pts.map(p => p[1])), 1);
    if (ymax === ymin) ymax = ymin + 1;
    if (xmax === xmin) xmax = xmin + 1;
    const px = x => padL + (x - xmin) / (xmax - xmin) * (W - padL - padR);
    const py = y => H - padB - (y - ymin) / (ymax - ymin) * (H - padT - padB);
    let g = '';
    for (let i = 0; i <= 4; i++) {
      const yv = ymin + (ymax - ymin) * i / 4, y = py(yv);
      g += `<line class="gridline" x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}"/>`;
      g += `<text class="axislabel" x="${padL - 6}" y="${y + 3}" text-anchor="end">${VZ.fmt(yv, Math.abs(ymax - ymin) >= 10 ? 0 : 1)}</text>`;
    }
    for (let i = 1; i < 4; i++) { const xv = xmin + (xmax - xmin) * i / 4; g += `<line class="gridline" x1="${px(xv)}" y1="${padT}" x2="${px(xv)}" y2="${H - padB}"/>`; }
    g += `<line class="axis" x1="${padL}" y1="${py(ymin)}" x2="${W - padR}" y2="${py(ymin)}"/>`;
    g += `<line class="axis" x1="${padL}" y1="${padT}" x2="${padL}" y2="${H - padB}"/>`;
    g += `<text class="axislabel" x="${padL}" y="${H - padB + 16}" text-anchor="start">${VZ.fmt(xmin, 0)}</text>`;
    g += `<text class="axislabel" x="${W - padR}" y="${H - padB + 16}" text-anchor="end">${VZ.fmt(xmax, 0)}</text>`;
    if (opts.xlab) g += `<text class="axislabel" x="${(padL + W - padR) / 2}" y="${H - padB + 16}" text-anchor="middle">${opts.xlab}</text>`;
    if (opts.ylab) g += `<text class="axislabel" x="${padL - 30}" y="${(padT + H - padB) / 2}" text-anchor="middle" transform="rotate(-90 ${padL - 30} ${(padT + H - padB) / 2})">${opts.ylab}</text>`;
    if (opts.hline) {
      const y = py(opts.hline.y);
      g += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="var(--faint)" stroke-width="1" stroke-dasharray="4 3"/>`;
      if (opts.hline.label) g += `<text class="axislabel" x="${W - padR}" y="${y - 4}" text-anchor="end" fill="var(--faint)">${opts.hline.label}</text>`;
    }
    all.forEach(s => {
      const d = s.pts.map((p, i) => `${i ? 'L' : 'M'}${px(p[0]).toFixed(1)},${py(p[1]).toFixed(1)}`).join(' ');
      g += `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2.5" ${s.dash ? `stroke-dasharray="${s.dash}"` : ''} stroke-linejoin="round"/>`;
    });
    if (opts.legend !== false) {
      let lx = padL;
      all.forEach(s => { if (!s.label) return;
        g += `<line x1="${lx}" y1="10" x2="${lx + 16}" y2="10" stroke="${s.color}" stroke-width="3" ${s.dash ? `stroke-dasharray="${s.dash}"` : ''}/>`;
        g += `<text x="${lx + 20}" y="13" font-size="11" font-family="JetBrains Mono" fill="var(--muted)">${s.label}</text>`;
        lx += 26 + (s.label.length * 7.2); });
    }
    return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${opts.aria || '꺾은선 차트'}" style="max-width:100%;display:block">${g}</svg>`;
  }
  VZ.linePlot = linePlot;
})(window);

/* ============================================================
   2D 보드/벡터/애니메이션 (VZ.LA) — 벡터장·등방 좌표용
   ============================================================ */
(function (global) {
  'use strict';
  const VZ = global.VZ;
  function arrowDefsAndLine(x1, y1, x2, y2, color, lw) {
    const id = 'ah' + Math.round(Math.abs(x1 * 7 + y1 * 13 + x2 * 17 + y2 * 23)) + color.replace(/[^a-z0-9]/gi, '');
    let s = `<defs><marker id="${id}" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 Z" fill="${color}"/></marker></defs>`;
    s += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${color}" stroke-width="${lw}" marker-end="url(#${id})"/>`;
    return s;
  }
  // 두 픽셀점 사이 화살표 (범용)
  function arrowPx(x1, y1, x2, y2, color, { lw = 2.5 } = {}) { return arrowDefsAndLine(x1, y1, x2, y2, color, lw); }
  // 보간 애니메이션(스칼라 t): cb(t∈0..1) 반복 호출. 취소함수 반환.
  function tween(cb, dur = 800, done) {
    const t0 = performance.now(); let cancelled = false, raf = 0;
    function frame(now) {
      if (cancelled) return;
      let t = Math.min(1, (now - t0) / dur);
      t = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      cb(t);
      if (t < 1) raf = requestAnimationFrame(frame); else if (done) done();
    }
    raf = requestAnimationFrame(frame);
    return () => { cancelled = true; cancelAnimationFrame(raf); };
  }
  VZ.LA = { arrowPx, tween };
})(window);

/* ============================================================
   알고리즘·자료구조 엔진 (VZ.AL)
   설계 철학: "기록-재생". 알고리즘을 한 번 돌리며 상태 스냅샷을 rec.snap()으로
   쌓고, player가 그 프레임들을 ▶/⏸/⏭/스크럽/속도로 재생. 렌더러는 순수 함수
   (상태 → SVG 문자열). DOM diff 없이 매 프레임 통짜 재렌더.
   - recorder()                : {snap(state,meta), frames}
   - player(frames,render,opts) : {play,pause,step,seek,reset,setSpeed,cancel,idx,playing,length}
   - transport(sel,frames,render,opts) : 컨트롤 UI 마운트 + player 생성·반환
   - bars(values,opts)          : 배열 막대 (상태색·포인터)
   - grid(rows,cols,opts)       : 격자 (BFS/DFS·미로·DP-on-grid)
   - dpTable(grid2d,opts)       : 2D DP 표 (셀 채우기·의존 화살표)
   - graph(nodes,edges,opts)    : 노드·엣지 (좌표 저자 지정)
   - tree(root,opts)            : 트리 / 재귀 호출트리
   - heatColor(t)               : 값→색 (낮음 남보라 → 높음 노랑)
   상태색 규약: idle=슬레이트, compare=청록(--q), swap/active=앰버(--hot),
                done/sorted=초록(--good), pivot/special=보라(--v),
                min/sel=핑크(--pink), wall/excl=코랄(--k), frontier=핑크(--pink)
   ============================================================ */
(function (global) {
  'use strict';
  const VZ = global.VZ;

  function heatColor(t) {
    t = Math.max(0, Math.min(1, t));
    const stops = [[30, 27, 75], [37, 99, 142], [52, 211, 153], [251, 191, 36]];
    const seg = t * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(seg)), f = seg - i;
    const c = stops[i].map((v, k) => Math.round(v + (stops[i + 1][k] - v) * f));
    return `rgb(${c[0]},${c[1]},${c[2]})`;
  }

  const STATE = {
    idle: 'var(--slate)', compare: 'var(--q)', swap: 'var(--hot)', active: 'var(--hot)',
    done: 'var(--good)', sorted: 'var(--good)', pivot: 'var(--v)', special: 'var(--v)',
    min: 'var(--pink)', sel: 'var(--pink)', frontier: 'var(--pink)', visiting: 'var(--hot)',
    wall: 'var(--k)', excl: 'var(--k)', path: 'var(--good)'
  };
  const col = s => STATE[s] || (s && s.startsWith('var(') ? s : 'var(--slate)');

  // ---- 기록-재생 코어 ----
  function recorder() {
    const frames = [];
    return {
      frames,
      snap(state, meta = {}) { frames.push({ state: JSON.parse(JSON.stringify(state)), meta }); return frames.length; },
    };
  }

  function player(frames, render, opts = {}) {
    const baseInterval = opts.interval || 600;
    let idx = 0, playing = false, timer = null, speed = 1;
    function show() { if (frames.length) render(frames[idx], idx, frames); if (opts.onIdx) opts.onIdx(idx, playing); }
    function stop() { playing = false; if (timer) { clearTimeout(timer); timer = null; } }
    function tick() {
      if (!playing) return;
      if (idx >= frames.length - 1) { stop(); show(); return; }
      idx++; show(); timer = setTimeout(tick, baseInterval / speed);
    }
    function play() { if (playing || !frames.length) return; if (idx >= frames.length - 1) idx = 0; playing = true; show(); timer = setTimeout(tick, baseInterval / speed); }
    function pause() { stop(); show(); }
    function step(d = 1) { stop(); idx = Math.max(0, Math.min(frames.length - 1, idx + d)); show(); }
    function seek(i) { stop(); idx = Math.max(0, Math.min(frames.length - 1, i)); show(); }
    function reset() { stop(); idx = 0; show(); }
    function setSpeed(m) { speed = m; if (playing && timer) { clearTimeout(timer); timer = setTimeout(tick, baseInterval / speed); } }
    function cancel() { stop(); }
    return {
      play, pause, step, seek, reset, setSpeed, cancel, show,
      get idx() { return idx; }, get playing() { return playing; }, get length() { return frames.length; },
    };
  }

  // 컨트롤 바 + 스크러버 + 속도. player를 만들어 반환. 같은 컨테이너 재호출 시 이전 player 취소.
  function transport(sel, frames, render, opts = {}) {
    const el = typeof sel === 'string' ? document.querySelector(sel) : sel;
    if (!el) return null;
    if (el._alPlayer) el._alPlayer.cancel();
    const speeds = opts.speeds || [0.5, 1, 2], scrubber = opts.scrubber !== false;
    const N = frames.length;
    el.innerHTML =
      `<div class="al-transport">
        <button class="btn" data-a="play">▶ 재생</button>
        <button class="btn" data-a="pause" style="display:none">⏸ 정지</button>
        <button class="btn" data-a="prev">⏮</button>
        <button class="btn" data-a="next">⏭</button>
        <button class="btn" data-a="reset">↺</button>
        ${scrubber ? `<input class="al-scrub" type="range" min="0" max="${Math.max(0, N - 1)}" value="0" style="flex:1;min-width:90px">` : ''}
        <span class="al-speed">${speeds.map((s, i) => `<button class="btn sp ${s === 1 ? 'on' : ''}" data-sp="${s}">${s}×</button>`).join('')}</span>
      </div>
      <div class="al-stepinfo" data-role="stepinfo"></div>`;
    const playBtn = el.querySelector('[data-a=play]'), pauseBtn = el.querySelector('[data-a=pause]');
    const scrub = el.querySelector('.al-scrub'), info = el.querySelector('[data-role=stepinfo]');
    function onIdx(i, playing) {
      if (scrub) scrub.value = i;
      playBtn.style.display = playing ? 'none' : '';
      pauseBtn.style.display = playing ? '' : 'none';
      const m = frames[i] && frames[i].meta;
      if (info) info.innerHTML = m && m.note ? `<span class="al-stepnum">${i}/${N - 1}</span> ${m.note}` : `<span class="al-stepnum">${i}/${N - 1}</span>`;
    }
    const p = player(frames, render, { interval: opts.interval || 600, onIdx });
    el.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.a === 'play') p.play();
      else if (b.dataset.a === 'pause') p.pause();
      else if (b.dataset.a === 'next') p.step(1);
      else if (b.dataset.a === 'prev') p.step(-1);
      else if (b.dataset.a === 'reset') p.reset();
      else if (b.dataset.sp) { p.setSpeed(+b.dataset.sp); el.querySelectorAll('.sp').forEach(x => x.classList.toggle('on', x === b)); }
    });
    if (scrub) scrub.addEventListener('input', e => p.seek(+e.target.value));
    el._alPlayer = p; p.reset();
    return p;
  }

  // ---- 배열 막대 (정렬·탐색) ----
  function bars(values, opts = {}) {
    const W = opts.W || 540, H = opts.H || 240, pad = opts.pad ?? 26, gap = opts.gap ?? 4;
    const n = values.length, maxV = opts.maxV || Math.max(...values, 1);
    const botPad = opts.pointers ? 30 : 14, topPad = 18;
    const plotW = W - pad * 2, plotH = H - botPad - topPad;
    const bw = n ? (plotW - gap * (n - 1)) / n : plotW;
    const state = opts.state || {}, ptr = opts.pointers || {};
    let g = '';
    values.forEach((v, i) => {
      const h = Math.max(2, v / maxV * plotH), x = pad + i * (bw + gap), y = H - botPad - h;
      g += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="2.5" fill="${col(state[i])}" opacity="0.92"/>`;
      if (opts.showVals !== false && n <= 26) g += `<text x="${(x + bw / 2).toFixed(1)}" y="${(y - 4).toFixed(1)}" text-anchor="middle" font-size="11" fill="var(--muted)" font-family="JetBrains Mono">${v}</text>`;
    });
    Object.entries(ptr).forEach(([name, i]) => {
      if (i == null || i < 0 || i >= n) return;
      const x = pad + i * (bw + gap) + bw / 2;
      g += `<text x="${x.toFixed(1)}" y="${H - 8}" text-anchor="middle" font-size="11.5" fill="var(--hot)" font-family="JetBrains Mono" font-weight="700">↑${name}</text>`;
    });
    return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="max-width:100%;display:block">${g}</svg>`;
  }

  // ---- 격자 (BFS/DFS·미로·grid-DP) ----
  function grid(rows, cols, opts = {}) {
    const W = opts.W || 420, H = opts.H || 420, pad = 8;
    const cw = (W - pad * 2) / cols, ch = (H - pad * 2) / rows;
    const cellState = opts.cellState || (() => ''), labels = opts.labels || (() => '');
    let g = '';
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x = pad + c * cw, y = pad + r * ch, s = cellState(r, c);
      const fill = s ? col(s) : 'var(--panel-2)';
      g += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(cw - 1.5).toFixed(1)}" height="${(ch - 1.5).toFixed(1)}" rx="3" fill="${fill}" opacity="${s ? 0.9 : 1}" stroke="var(--line)" stroke-width="1"/>`;
      const lab = labels(r, c);
      if (lab !== '' && lab != null) g += `<text x="${(x + cw / 2).toFixed(1)}" y="${(y + ch / 2 + 4).toFixed(1)}" text-anchor="middle" font-size="${Math.min(15, cw * 0.4).toFixed(0)}" fill="var(--ink)" font-family="JetBrains Mono">${lab}</text>`;
    }
    (opts.arrows || []).forEach(([r1, c1, r2, c2]) => {
      const x1 = pad + c1 * cw + cw / 2, y1 = pad + r1 * ch + ch / 2, x2 = pad + c2 * cw + cw / 2, y2 = pad + r2 * ch + ch / 2;
      g += VZ.LA.arrowPx(x1, y1, x2, y2, 'var(--hot)', { lw: 2 });
    });
    return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="max-width:100%;display:block">${g}</svg>`;
  }

  // ---- 2D DP 표 ----
  function dpTable(grid2d, opts = {}) {
    const rows = grid2d.length, cols = grid2d[0] ? grid2d[0].length : 0;
    const rl = opts.rowLabels || [], cl = opts.colLabels || [];
    const hasR = rl.length > 0, hasC = cl.length > 0;
    const W = opts.W || 480, H = opts.H || 320, m = 26;
    const ox = hasR ? m : 4, oy = hasC ? m : 4;
    const cw = (W - ox - 4) / cols, ch = (H - oy - 4) / rows;
    const fill = opts.fill || {}, active = opts.active || null, deps = opts.deps || [];
    let g = '';
    if (hasC) cl.forEach((t, c) => { g += `<text x="${(ox + c * cw + cw / 2).toFixed(1)}" y="16" text-anchor="middle" font-size="12" fill="var(--faint)" font-family="JetBrains Mono">${t}</text>`; });
    if (hasR) rl.forEach((t, r) => { g += `<text x="${(ox - 6).toFixed(1)}" y="${(oy + r * ch + ch / 2 + 4).toFixed(1)}" text-anchor="end" font-size="12" fill="var(--faint)" font-family="JetBrains Mono">${t}</text>`; });
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x = ox + c * cw, y = oy + r * ch, key = r + ',' + c;
      const isActive = active && active[0] === r && active[1] === c;
      const fs = fill[key];
      const bg = isActive ? 'var(--hot)' : fs ? col(fs) : 'var(--panel-2)';
      g += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(cw - 2).toFixed(1)}" height="${(ch - 2).toFixed(1)}" rx="3" fill="${bg}" opacity="${isActive || fs ? 0.92 : 1}" stroke="var(--line)" stroke-width="1"/>`;
      const val = grid2d[r][c];
      if (val !== '' && val != null) g += `<text x="${(x + cw / 2).toFixed(1)}" y="${(y + ch / 2 + 4).toFixed(1)}" text-anchor="middle" font-size="13" fill="${isActive ? '#0b0e14' : 'var(--ink)'}" font-family="JetBrains Mono">${val}</text>`;
    }
    if (active) deps.forEach(([dr, dc]) => {
      if (dr < 0 || dc < 0 || dr >= rows || dc >= cols) return;
      const x1 = ox + dc * cw + cw / 2, y1 = oy + dr * ch + ch / 2, x2 = ox + active[1] * cw + cw / 2, y2 = oy + active[0] * ch + ch / 2;
      g += VZ.LA.arrowPx(x1, y1, x2, y2, 'var(--q)', { lw: 2 });
    });
    return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="max-width:100%;display:block">${g}</svg>`;
  }

  // ---- 그래프 (좌표는 노드에 0..1 정규화로 주어짐) ----
  function graph(nodes, edges, opts = {}) {
    const W = opts.W || 460, H = opts.H || 380, pad = 34, r = opts.r || 17;
    const X = nx => pad + nx * (W - pad * 2), Y = ny => pad + ny * (H - pad * 2);
    const pos = {}; nodes.forEach(nd => pos[nd.id] = [X(nd.x), Y(nd.y)]);
    const nodeState = opts.nodeState || {}, edgeState = opts.edgeState || {}, dist = opts.distances || {};
    const directed = opts.directed;
    let g = '';
    edges.forEach(([a, b, w]) => {
      const [x1, y1] = pos[a], [x2, y2] = pos[b], key = a + '-' + b, es = edgeState[key] || edgeState[b + '-' + a];
      const stroke = es ? col(es) : 'var(--line)', sw = es ? 3 : 1.6;
      if (directed) g += VZ.LA.arrowPx(x1, y1, x2, y2, stroke, { lw: sw });
      else g += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${stroke}" stroke-width="${sw}"/>`;
      if (w != null) { const mx = (x1 + x2) / 2, my = (y1 + y2) / 2; g += `<rect x="${(mx - 9).toFixed(1)}" y="${(my - 9).toFixed(1)}" width="18" height="16" rx="3" fill="var(--bg)" opacity="0.85"/><text x="${mx.toFixed(1)}" y="${(my + 3).toFixed(1)}" text-anchor="middle" font-size="11" fill="var(--muted)" font-family="JetBrains Mono">${w}</text>`; }
    });
    nodes.forEach(nd => {
      const [x, y] = pos[nd.id], s = nodeState[nd.id];
      g += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${s ? col(s) : 'var(--panel-2)'}" stroke="${s ? '#0b0e14' : 'var(--line)'}" stroke-width="2"/>`;
      g += `<text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="middle" font-size="13" fill="${s ? '#0b0e14' : 'var(--ink)'}" font-family="JetBrains Mono" font-weight="700">${nd.label != null ? nd.label : nd.id}</text>`;
      if (dist[nd.id] != null) g += `<text x="${x.toFixed(1)}" y="${(y - r - 5).toFixed(1)}" text-anchor="middle" font-size="11.5" fill="var(--hot)" font-family="JetBrains Mono">${dist[nd.id] === Infinity ? '∞' : dist[nd.id]}</text>`;
    });
    return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="max-width:100%;display:block">${g}</svg>`;
  }

  // 원형 배치 헬퍼: id 배열 → [{id,x,y}]
  function layoutCircle(ids, { cx = 0.5, cy = 0.5, rad = 0.4 } = {}) {
    const n = ids.length;
    return ids.map((id, i) => { const a = -Math.PI / 2 + i / n * 2 * Math.PI; return { id, x: cx + rad * Math.cos(a), y: cy + rad * Math.sin(a) }; });
  }

  // ---- 트리 / 재귀 호출트리 ----  root: {id?,label,children:[...],state?}
  function tree(root, opts = {}) {
    const W = opts.W || 520, H = opts.H || 320, pad = 24, r = opts.r || 16;
    // 깊이별 배치: 각 리프에 가로 슬롯 할당
    let leaf = 0; const depthMax = { d: 0 };
    function assign(nd, depth) {
      nd._d = depth; depthMax.d = Math.max(depthMax.d, depth);
      if (!nd.children || !nd.children.length) { nd._x = leaf++; return nd._x; }
      const xs = nd.children.map(c => assign(c, depth + 1));
      nd._x = (Math.min(...xs) + Math.max(...xs)) / 2; return nd._x;
    }
    assign(root, 0);
    const leaves = Math.max(1, leaf);
    const X = lx => pad + (leaves === 1 ? 0.5 : lx / (leaves - 1)) * (W - pad * 2);
    const Y = d => pad + (depthMax.d === 0 ? 0 : d / depthMax.d) * (H - pad * 2);
    let edgesSvg = '', nodesSvg = '';
    function walk(nd) {
      const x = X(nd._x), y = Y(nd._d);
      (nd.children || []).forEach(c => {
        const cx = X(c._x), cy = Y(c._d);
        edgesSvg += `<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${cx.toFixed(1)}" y2="${cy.toFixed(1)}" stroke="${c.edgeState ? col(c.edgeState) : 'var(--line)'}" stroke-width="${c.edgeState ? 3 : 1.6}"/>`;
        walk(c);
      });
      const s = nd.state;
      nodesSvg += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${s ? col(s) : 'var(--panel-2)'}" stroke="${s ? '#0b0e14' : 'var(--line)'}" stroke-width="2"/>`;
      nodesSvg += `<text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="middle" font-size="12" fill="${s ? '#0b0e14' : 'var(--ink)'}" font-family="JetBrains Mono" font-weight="700">${nd.label}</text>`;
    }
    walk(root);
    return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="max-width:100%;display:block">${edgesSvg}${nodesSvg}</svg>`;
  }

  // 색 범례: items = [['비교','compare'], ['교환','swap'], ...] → 작은 칩 줄
  function legend(items) {
    return '<div class="al-legend">' + items.map(([label, st]) =>
      `<span class="al-leg"><i style="background:${col(st)}"></i>${label}</span>`).join('') + '</div>';
  }

  VZ.AL = { heatColor, recorder, player, transport, bars, grid, dpTable, graph, layoutCircle, tree, legend, STATE };
})(window);

/* ============================================================
   3D 변환·투영 엔진 (VZ.R3) — 로봇 좌표·회전의 심장
   규약: 오른손 좌표계, Z=위, X=앞, Y=왼쪽 (ROS REP-103).
   축 색: X=빨강, Y=초록, Z=파랑 (RViz 표준).
   회전은 3×3 행렬, 자세는 4×4 동차변환 {R,t}로, 화면엔 직교투영.
   ============================================================ */
(function (global) {
  'use strict';
  const VZ = global.VZ;
  const AX = ['#fb7185', '#34d399', '#60a5fa'];   // X=red, Y=green, Z=blue
  const TAU = Math.PI * 2;

  // ---- 벡터 ----
  const v = {
    add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
    sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
    scale: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
    dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
    cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
    len: a => Math.hypot(a[0], a[1], a[2]),
    norm: a => { const L = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / L, a[1] / L, a[2] / L]; },
    lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
  };

  // ---- 3×3 행렬 (행 우선) ----
  const I3 = () => [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  function mul3(A, B) {
    const C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { let s = 0; for (let k = 0; k < 3; k++) s += A[i][k] * B[k][j]; C[i][j] = s; }
    return C;
  }
  const matVec = (M, p) => [M[0][0] * p[0] + M[0][1] * p[1] + M[0][2] * p[2], M[1][0] * p[0] + M[1][1] * p[1] + M[1][2] * p[2], M[2][0] * p[0] + M[2][1] * p[1] + M[2][2] * p[2]];
  const transpose3 = M => [[M[0][0], M[1][0], M[2][0]], [M[0][1], M[1][1], M[2][1]], [M[0][2], M[1][2], M[2][2]]];
  const col = (M, i) => [M[0][i], M[1][i], M[2][i]];
  function rotX(a) { const c = Math.cos(a), s = Math.sin(a); return [[1, 0, 0], [0, c, -s], [0, s, c]]; }
  function rotY(a) { const c = Math.cos(a), s = Math.sin(a); return [[c, 0, s], [0, 1, 0], [-s, 0, c]]; }
  function rotZ(a) { const c = Math.cos(a), s = Math.sin(a); return [[c, -s, 0], [s, c, 0], [0, 0, 1]]; }
  const ROT = { X: rotX, Y: rotY, Z: rotZ };
  // 오일러: order 문자열 좌→우 순서로 행렬 곱 (intrinsic). 기본 ZYX = Rz(yaw)Ry(pitch)Rx(roll).
  function euler(ax, ay, az, order = 'ZYX') {
    const ang = { X: ax, Y: ay, Z: az };
    let M = I3();
    for (const L of order) M = mul3(M, ROT[L](ang[L]));
    return M;
  }
  const eulerZYX = (roll, pitch, yaw) => euler(roll, pitch, yaw, 'ZYX');
  // 행렬 → ZYX 오일러 (roll about X, pitch about Y, yaw about Z)
  function matToEulerZYX(R) {
    const sy = -R[2][0];
    let roll, pitch, yaw;
    const GIMBAL = 0.9999;   // |sin(pitch)|>0.9999 ≈ pitch 89.2° 이상이면 짐벌락 영역(분기·플래그 동일 임계)
    if (Math.abs(sy) > GIMBAL) {            // 짐벌락: pitch ±90°
      pitch = Math.sign(sy) * Math.PI / 2; yaw = 0;
      roll = Math.atan2(-R[0][1], R[1][1]);
    } else {
      pitch = Math.asin(sy);
      roll = Math.atan2(R[2][1], R[2][2]);
      yaw = Math.atan2(R[1][0], R[0][0]);
    }
    return { roll, pitch, yaw, gimbal: Math.abs(sy) > GIMBAL };
  }
  // Rodrigues: 축(단위)+각 → 행렬
  function axisAngle(axis, ang) {
    const u = v.norm(axis), c = Math.cos(ang), s = Math.sin(ang), t = 1 - c, [x, y, z] = u;
    return [
      [t * x * x + c, t * x * y - s * z, t * x * z + s * y],
      [t * x * y + s * z, t * y * y + c, t * y * z - s * x],
      [t * x * z - s * y, t * y * z + s * x, t * z * z + c],
    ];
  }
  function matToAxisAngle(R) {
    const tr = R[0][0] + R[1][1] + R[2][2];
    const ang = Math.acos(VZ.clamp((tr - 1) / 2, -1, 1));
    if (ang < 1e-6) return { axis: [0, 0, 1], angle: 0 };
    const s = 2 * Math.sin(ang);
    return { axis: [(R[2][1] - R[1][2]) / s, (R[0][2] - R[2][0]) / s, (R[1][0] - R[0][1]) / s], angle: ang };
  }

  // ---- 쿼터니언 {w,x,y,z} ----
  const Q = {
    fromAxisAngle(axis, ang) { const u = v.norm(axis), h = ang / 2, s = Math.sin(h); return { w: Math.cos(h), x: u[0] * s, y: u[1] * s, z: u[2] * s }; },
    mul(a, b) {
      return {
        w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
        x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
        y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
        z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
      };
    },
    norm(q) { const L = Math.hypot(q.w, q.x, q.y, q.z) || 1; return { w: q.w / L, x: q.x / L, y: q.y / L, z: q.z / L }; },
    conj: q => ({ w: q.w, x: -q.x, y: -q.y, z: -q.z }),
    toMat(q) {
      const { w, x, y, z } = Q.norm(q);
      return [
        [1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y)],
        [2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x)],
        [2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y)],
      ];
    },
    fromMat(R) {
      const tr = R[0][0] + R[1][1] + R[2][2];
      let w, x, y, z;
      if (tr > 0) { const s = Math.sqrt(tr + 1) * 2; w = s / 4; x = (R[2][1] - R[1][2]) / s; y = (R[0][2] - R[2][0]) / s; z = (R[1][0] - R[0][1]) / s; }
      else if (R[0][0] > R[1][1] && R[0][0] > R[2][2]) { const s = Math.sqrt(1 + R[0][0] - R[1][1] - R[2][2]) * 2; w = (R[2][1] - R[1][2]) / s; x = s / 4; y = (R[0][1] + R[1][0]) / s; z = (R[0][2] + R[2][0]) / s; }
      else if (R[1][1] > R[2][2]) { const s = Math.sqrt(1 + R[1][1] - R[0][0] - R[2][2]) * 2; w = (R[0][2] - R[2][0]) / s; x = (R[0][1] + R[1][0]) / s; y = s / 4; z = (R[1][2] + R[2][1]) / s; }
      else { const s = Math.sqrt(1 + R[2][2] - R[0][0] - R[1][1]) * 2; w = (R[1][0] - R[0][1]) / s; x = (R[0][2] + R[2][0]) / s; y = (R[1][2] + R[2][1]) / s; z = s / 4; }
      return Q.norm({ w, x, y, z });
    },
    rotate(q, p) { return matVec(Q.toMat(q), p); },
    slerp(a, b, t) {
      a = Q.norm(a); b = Q.norm(b);
      let d = a.w * b.w + a.x * b.x + a.y * b.y + a.z * b.z;
      if (d < 0) { b = { w: -b.w, x: -b.x, y: -b.y, z: -b.z }; d = -d; }   // 최단 경로(이중덮개)
      if (d > 0.9995) return Q.norm({ w: a.w + (b.w - a.w) * t, x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t });
      const th = Math.acos(d), s = Math.sin(th), w0 = Math.sin((1 - t) * th) / s, w1 = Math.sin(t * th) / s;
      return { w: a.w * w0 + b.w * w1, x: a.x * w0 + b.x * w1, y: a.y * w0 + b.y * w1, z: a.z * w0 + b.z * w1 };
    },
  };

  // ---- 4×4 동차변환 {R:3×3, t:[x,y,z]} ----
  const T = {
    make: (R, t) => ({ R: R || I3(), t: t || [0, 0, 0] }),
    mul: (A, B) => ({ R: mul3(A.R, B.R), t: v.add(matVec(A.R, B.t), A.t) }),
    inv: A => { const Rt = transpose3(A.R); return { R: Rt, t: v.scale(matVec(Rt, A.t), -1) }; },
    apply: (A, p) => v.add(matVec(A.R, p), A.t),
  };

  // ---- 카메라/투영 (직교) ----
  // az: 방위(world Z 둘레), el: 고도. 카메라는 +Y를 바라보고 +Z가 화면 위.
  function scene(opts = {}) {
    const W = opts.W || 520, H = opts.H || 360, zoom = opts.zoom || 60;
    const az = opts.az == null ? -0.9 : opts.az, el = opts.el == null ? 0.45 : opts.el;
    const cx = opts.cx == null ? W / 2 : opts.cx, cy = opts.cy == null ? H / 2 + 24 : opts.cy;
    const pan = opts.pan || [0, 0, 0];
    const Rv = mul3(rotX(-(Math.PI / 2 - el)), rotZ(-az));   // world → view (카메라가 +Y축 방향을 봄)
    function project(p) {
      const q = matVec(Rv, [p[0] - pan[0], p[1] - pan[1], p[2] - pan[2]]);
      return { x: cx + q[0] * zoom, y: cy - q[2] * zoom, depth: q[1] };
    }
    return { W, H, zoom, az, el, cx, cy, project };
  }

  function svg(sc, inner, aria) {
    return `<svg width="${sc.W}" height="${sc.H}" viewBox="0 0 ${sc.W} ${sc.H}" role="img" aria-label="${aria || '3D 장면'}" style="max-width:100%;display:block;touch-action:none">${inner}</svg>`;
  }

  // 바닥 격자 (z=0 평면)
  function ground(sc, { size = 3, step = 1, color = 'rgba(255,255,255,.10)' } = {}) {
    let s = '';
    for (let i = -size; i <= size; i += step) {
      const a = sc.project([i, -size, 0]), b = sc.project([i, size, 0]);
      const c = sc.project([-size, i, 0]), d = sc.project([size, i, 0]);
      s += `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="${color}" stroke-width="1"/>`;
      s += `<line x1="${c.x.toFixed(1)}" y1="${c.y.toFixed(1)}" x2="${d.x.toFixed(1)}" y2="${d.y.toFixed(1)}" stroke="${color}" stroke-width="1"/>`;
    }
    return s;
  }

  // 좌표 프레임: 원점 t에서 회전 R의 세 열을 빨강(X)·초록(Y)·파랑(Z) 화살표로
  function frame(sc, Tr, { scale = 1, labels = null, lw = 3, names = ['X', 'Y', 'Z'] } = {}) {
    const R = Tr.R || I3(), o = Tr.t || [0, 0, 0];
    const po = sc.project(o);
    const axes = [0, 1, 2].map(i => {
      const end = v.add(o, v.scale(col(R, i), scale));
      return { i, end: sc.project(end), depth: sc.project(v.add(o, v.scale(col(R, i), scale * 0.5))).depth };
    }).sort((a, b) => b.depth - a.depth);   // 먼 축 먼저
    let s = '';
    axes.forEach(a => {
      s += VZ.LA.arrowPx(po.x, po.y, a.end.x, a.end.y, AX[a.i], { lw });
      if (labels !== false) s += `<text x="${a.end.x.toFixed(1)}" y="${(a.end.y - 4).toFixed(1)}" font-size="12" font-weight="700" font-family="JetBrains Mono" fill="${AX[a.i]}">${(labels && labels[a.i]) || names[a.i]}</text>`;
    });
    s += `<circle cx="${po.x.toFixed(1)}" cy="${po.y.toFixed(1)}" r="3" fill="var(--ink)"/>`;
    return s;
  }

  function point(sc, p, { r = 4, color = 'var(--hot)', label = null } = {}) {
    const q = sc.project(p);
    let s = `<circle cx="${q.x.toFixed(1)}" cy="${q.y.toFixed(1)}" r="${r}" fill="${color}"/>`;
    if (label) s += `<text x="${(q.x + 7).toFixed(1)}" y="${(q.y + 4).toFixed(1)}" font-size="12" font-family="JetBrains Mono" fill="${color}">${label}</text>`;
    return s;
  }

  function segment(sc, p1, p2, { color = 'var(--muted)', lw = 2, dash = null } = {}) {
    const a = sc.project(p1), b = sc.project(p2);
    return `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="${color}" stroke-width="${lw}" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`;
  }

  function arrow(sc, p1, p2, { color = 'var(--hot)', lw = 2.5 } = {}) {
    const a = sc.project(p1), b = sc.project(p2);
    return VZ.LA.arrowPx(a.x, a.y, b.x, b.y, color, { lw });
  }

  // 와이어프레임 박스: 변환 Tr 아래 중심 원점, 크기 size=[sx,sy,sz]
  const BOX_E = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
  function box(sc, Tr, { size = [1, 0.6, 0.4], color = 'var(--muted)', lw = 2, face = true } = {}) {
    const [sx, sy, sz] = size.map(x => x / 2);
    const corners = [[-sx, -sy, -sz], [sx, -sy, -sz], [sx, sy, -sz], [-sx, sy, -sz], [-sx, -sy, sz], [sx, -sy, sz], [sx, sy, sz], [-sx, sy, sz]]
      .map(c => sc.project(T.apply(Tr, c)));
    let s = '';
    if (face) {   // 앞면 살짝 채움(맨 위 z+면)
      const top = [4, 5, 6, 7].map(i => corners[i]);
      s += `<polygon points="${top.map(p => p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' ')}" fill="${color}" opacity="0.10"/>`;
    }
    BOX_E.forEach(([a, b]) => { s += `<line x1="${corners[a].x.toFixed(1)}" y1="${corners[a].y.toFixed(1)}" x2="${corners[b].x.toFixed(1)}" y2="${corners[b].y.toFixed(1)}" stroke="${color}" stroke-width="${lw}"/>`; });
    return s;
  }

  // 회전 각 호: 중심 c에서 from→ 축(axis) 둘레로 angle만큼 (단위원 반지름 r)
  function arc(sc, center, axis, fromVec, angle, { r = 0.8, color = 'var(--hot)', n = 24 } = {}) {
    const u = v.norm(axis), f = v.norm(fromVec), steps = Math.max(2, Math.round(n * Math.abs(angle) / TAU));
    let d = '';
    for (let k = 0; k <= steps; k++) {
      const a = angle * k / steps, R = axisAngle(u, a), p = sc.project(v.add(center, v.scale(matVec(R, f), r)));
      d += (k ? 'L' : 'M') + p.x.toFixed(1) + ',' + p.y.toFixed(1) + ' ';
    }
    return `<path d="${d.trim()}" fill="none" stroke="${color}" stroke-width="2" stroke-dasharray="3 2"/>`;
  }

  // 관절 사슬: links=[{T}] 누적 변환 배열의 원점들을 선분으로 잇고 각 프레임 표시
  function chain(sc, transforms, { linkColor = 'var(--muted)', frameScale = 0.5, lw = 4 } = {}) {
    let s = '';
    for (let i = 1; i < transforms.length; i++) s += segment(sc, transforms[i - 1].t, transforms[i].t, { color: linkColor, lw });
    transforms.forEach(Tr => { s += frame(sc, Tr, { scale: frameScale, labels: false }); });
    return s;
  }

  // 궤도 드래그: container 위 포인터 드래그로 az/el 갱신 → redraw 콜백
  function orbit(el, get, set) {
    if (!el) return;
    let drag = false, px = 0, py = 0;
    el.style.cursor = 'grab';
    el.addEventListener('pointerdown', e => { drag = true; px = e.clientX; py = e.clientY; el.style.cursor = 'grabbing'; try { el.setPointerCapture(e.pointerId); } catch (_) { } });
    el.addEventListener('pointermove', e => { if (!drag) return; const s = get(); set(s.az - (e.clientX - px) * 0.01, VZ.clamp(s.el + (e.clientY - py) * 0.01, -1.45, 1.45)); px = e.clientX; py = e.clientY; });
    const up = () => { drag = false; el.style.cursor = 'grab'; };
    el.addEventListener('pointerup', up); el.addEventListener('pointerleave', up);
  }

  VZ.R3 = { AX, TAU, v, I3, mul3, matVec, transpose3, col, rotX, rotY, rotZ, euler, eulerZYX, matToEulerZYX, axisAngle, matToAxisAngle, Q, T, scene, svg, ground, frame, point, segment, arrow, box, arc, chain, orbit };
})(window);
