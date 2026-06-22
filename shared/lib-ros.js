/* ============================================================
   ROS2 도메인 렌더러·로직 (VZ.ROS)
   VZ.AL(recorder/player/transport)·VZ.LA(arrowPx/tween)·VZ.R3(tf)에 의존.
   노드 박스·토픽 알약·메시지 패킷·시퀀스·executor 간트·큐·QoS 판정·디스커버리.
   모든 렌더러는 순수 함수(인자 → SVG 문자열 조각). 외부 출처 인용 없음.
   ============================================================ */
(function (global) {
  'use strict';
  const VZ = global.VZ, LA = VZ.LA, clamp = VZ.clamp, fmt = VZ.fmt;
  const C = {
    node: 'var(--q)', topic: 'var(--v)', msg: 'var(--hot)', ok: 'var(--good)',
    drop: 'var(--k)', wait: 'var(--slate)', dead: 'var(--k)', ping: 'var(--pink)', run: 'var(--hot)',
  };

  // ---- SVG 래퍼 ----
  function svg(W, H, inner, aria) {
    return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${aria || 'ROS2 그림'}" style="max-width:100%;display:block;background:var(--panel-2);border:1px solid var(--line);border-radius:12px">${inner}</svg>`;
  }

  // ---- 2D 보간 ----
  const lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

  // ---- 노드 박스 ----
  function box(x, y, w, h, label, opts = {}) {
    const col = opts.color || C.node, fill = opts.fill || 'var(--panel)';
    let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="9" fill="${fill}" stroke="${col}" stroke-width="${opts.lw || 2}"${opts.dim ? ' opacity="0.45"' : ''}/>`;
    s += `<text x="${x + w / 2}" y="${y + h / 2 + 4}" text-anchor="middle" font-size="12.5" font-family="JetBrains Mono" font-weight="700" fill="${opts.dim ? 'var(--muted)' : 'var(--ink)'}">${label}</text>`;
    if (opts.sub) s += `<text x="${x + w / 2}" y="${y + h - 6}" text-anchor="middle" font-size="9" font-family="JetBrains Mono" fill="var(--muted)">${opts.sub}</text>`;
    return s;
  }

  // ---- 토픽 알약 ----
  function pill(cx, cy, label, opts = {}) {
    const col = opts.color || C.topic, w = Math.max(54, label.length * 7.5 + 18), h = 22;
    let s = `<rect x="${(cx - w / 2).toFixed(1)}" y="${cy - h / 2}" width="${w.toFixed(1)}" height="${h}" rx="11" fill="none" stroke="${col}" stroke-width="${opts.active ? 2.4 : 1.4}"${opts.dim ? ' opacity="0.4"' : ''}/>`;
    s += `<text x="${cx}" y="${cy + 4}" text-anchor="middle" font-size="10.5" font-family="JetBrains Mono" fill="${col}">${label}</text>`;
    return s;
  }

  // ---- 엣지(화살표) ----
  function edge(x1, y1, x2, y2, opts = {}) {
    const col = opts.color || 'var(--line)';
    if (opts.dash) return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="${opts.lw || 1.6}" stroke-dasharray="${opts.dash}"${opts.dim ? ' opacity="0.4"' : ''}/>`;
    return LA.arrowPx(x1, y1, x2, y2, col, { lw: opts.lw || 1.8 });
  }

  // ---- 메시지 패킷 (경로 위 점) ----
  function packet(x, y, opts = {}) {
    const col = opts.color || C.msg, r = opts.r || 5;
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${col}"${opts.drop ? ' opacity="0.4"' : ''}/>`;
  }

  // ---- QoS 호환 판정 (순수) ----
  // pol = {reliability:'reliable'|'best_effort', durability:'volatile'|'transient_local'}
  // 규칙: requested(구독) ≤ offered(발행). reliable이 best_effort보다 '빡셈', transient_local이 volatile보다 '빡셈'.
  function compatQoS(pub, sub) {
    const reasons = []; let ok = true;
    if (sub.reliability === 'reliable' && pub.reliability === 'best_effort') { ok = false; reasons.push('신뢰성: 구독은 Reliable(다 받기)을 요구하는데 발행은 Best Effort'); }
    if (sub.durability === 'transient_local' && pub.durability === 'volatile') { ok = false; reasons.push('내구성: 구독은 늦게 와도 마지막 값을 원하는데(Transient Local) 발행은 Volatile'); }
    return { ok, reasons };
  }

  // ---- 큐 (슬롯 + 채움 + 오버플로 드롭) ----
  function queue(x, y, depth, count, opts = {}) {
    const slotW = opts.slotW || 26, slotH = opts.slotH || 22, gap = 3, vertical = opts.vertical;
    let s = ''; const filled = Math.min(count, depth), over = Math.max(0, count - depth);
    for (let i = 0; i < depth; i++) {
      const fx = vertical ? x : x + i * (slotW + gap), fy = vertical ? y - i * (slotH + gap) : y;
      const on = i < filled;
      s += `<rect x="${fx}" y="${fy}" width="${slotW}" height="${slotH}" rx="3" fill="${on ? (opts.color || C.msg) : 'var(--panel)'}" stroke="var(--line)" stroke-width="1" opacity="${on ? 0.9 : 1}"/>`;
    }
    if (over > 0) {  // 넘친 것 = 드롭
      const dx = vertical ? x : x + depth * (slotW + gap) + 6, dy = vertical ? y - depth * (slotH + gap) - 6 : y - 4;
      s += `<text x="${dx}" y="${dy + slotH / 2}" font-size="11" font-family="JetBrains Mono" fill="${C.drop}" font-weight="700">✕ ${over} 드롭</text>`;
    }
    return s;
  }

  // ---- executor 간트 (lanes × time) ----
  // lanes:[label], tasks:[{lane,t0,dur,label,state}], tmax: 시간 폭, playhead: 현재시각(옵션)
  function gantt(W, H, lanes, tasks, tmax, opts = {}) {
    const padL = 64, padR = 14, padT = 16, padB = 22;
    const laneH = (H - padT - padB) / Math.max(1, lanes.length);
    const xx = t => padL + (t / tmax) * (W - padL - padR);
    let s = '';
    lanes.forEach((ln, i) => {
      const y = padT + i * laneH;
      s += `<line x1="${padL}" y1="${y + laneH}" x2="${W - padR}" y2="${y + laneH}" stroke="var(--line)" opacity="0.4"/>`;
      s += `<text x="8" y="${y + laneH / 2 + 4}" font-size="10.5" font-family="JetBrains Mono" fill="var(--muted)">${ln}</text>`;
    });
    tasks.forEach(tk => {
      const li = lanes.indexOf(tk.lane); if (li < 0) return;
      const y = padT + li * laneH + 4, h = laneH - 8;
      const x0 = xx(tk.t0), w = Math.max(3, xx(tk.t0 + tk.dur) - x0);
      const col = tk.color || (tk.state === 'dead' ? C.dead : tk.state === 'wait' ? C.wait : tk.state === 'done' ? C.ok : C.run);
      s += `<rect x="${x0.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="3" fill="${col}" opacity="0.9"/>`;
      if (w > 26 && tk.label) s += `<text x="${(x0 + w / 2).toFixed(1)}" y="${(y + h / 2 + 4).toFixed(1)}" text-anchor="middle" font-size="9.5" font-family="JetBrains Mono" fill="#0b0e14" font-weight="700">${tk.label}</text>`;
    });
    if (opts.playhead != null) { const px = xx(opts.playhead); s += `<line x1="${px}" y1="${padT}" x2="${px}" y2="${H - padB}" stroke="var(--ink)" stroke-width="1.5"/>`; }
    // 시간 눈금
    for (let t = 0; t <= tmax + 1e-6; t += (opts.tick || tmax / 4)) s += `<text x="${xx(t)}" y="${H - 6}" text-anchor="middle" font-size="9" font-family="JetBrains Mono" fill="var(--faint)">${fmt(t, 0)}</text>`;
    return s;
  }

  // ---- 시퀀스 다이어그램 ----
  // lifelines:[{x,label,color}], msgs:[{from,to,y,label,kind}] (kind: req|resp|fb|cancel), upto: y컷오프(애니)
  function sequence(W, H, lifelines, msgs, opts = {}) {
    const topY = 30, botY = H - 12; let s = '';
    lifelines.forEach(ll => {
      s += `<rect x="${ll.x - 44}" y="6" width="88" height="22" rx="6" fill="var(--panel)" stroke="${ll.color || C.node}" stroke-width="1.6"/><text x="${ll.x}" y="21" text-anchor="middle" font-size="11" font-family="JetBrains Mono" fill="var(--ink)">${ll.label}</text>`;
      s += `<line x1="${ll.x}" y1="${topY}" x2="${ll.x}" y2="${botY}" stroke="var(--line)" stroke-dasharray="3 4"/>`;
    });
    const upto = opts.upto != null ? opts.upto : Infinity;
    msgs.forEach(m => {
      if (m.y > upto) return;
      const a = lifelines[m.from].x, b = lifelines[m.to].x;
      const col = m.kind === 'resp' ? C.ok : m.kind === 'fb' ? C.topic : m.kind === 'cancel' ? C.drop : C.msg;
      const dash = (m.kind === 'fb') ? '5 3' : null;
      s += dash ? `<line x1="${a}" y1="${m.y}" x2="${b}" y2="${m.y}" stroke="${col}" stroke-width="2" stroke-dasharray="${dash}"/>` + arrowHead(b, m.y, b > a ? 1 : -1, col) : LA.arrowPx(a, m.y, b, m.y, col, { lw: 2 });
      if (m.label) s += `<text x="${(a + b) / 2}" y="${m.y - 5}" text-anchor="middle" font-size="9.5" font-family="JetBrains Mono" fill="${col}">${m.label}</text>`;
    });
    return s;
  }
  function arrowHead(x, y, dir, col) { return `<path d="M${x} ${y} l${-7 * dir} -3.5 l0 7 Z" fill="${col}"/>`; }

  // ---- 진행바 ----
  function progress(x, y, w, frac, opts = {}) {
    const col = opts.color || C.topic;
    return `<rect x="${x}" y="${y}" width="${w}" height="10" rx="5" fill="var(--panel)" stroke="var(--line)"/><rect x="${x}" y="${y}" width="${(w * clamp(frac, 0, 1)).toFixed(1)}" height="10" rx="5" fill="${col}"/>`;
  }

  // ---- 디스커버리 핑 ----
  function ping(cx, cy, r, opts = {}) {
    return `<circle cx="${cx}" cy="${cy}" r="${r.toFixed(1)}" fill="none" stroke="${opts.color || C.ping}" stroke-width="1.6" opacity="${clamp(1 - r / (opts.max || 120), 0, 1).toFixed(2)}"/>`;
  }

  VZ.ROS = { C, svg, lerp2, box, pill, edge, packet, compatQoS, queue, gantt, sequence, progress, ping, arrowHead };
})(window);
