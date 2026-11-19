// ==========================================================================
// AU Campaign CRM — Battlecard & Pitch Component (Linear Disclosure)
// ==========================================================================

import { IC } from '../config.js';
import { esc } from '../utils/dom.js';

export function getBattlecardHTML(event) {
  const evName = event?.name || 'Upcoming Exhibition';
  const evWhere = event?.where || 'Convention Centre';
  const evDates = event?.start ? `${event.start} to ${event.end || ''}` : 'Upcoming dates';

  return `
    <div class="battlecard-box">
      <div class="battlecard-header" data-act="toggle-battlecard">
        <span style="display:flex;align-items:center;gap:7px">
          ${IC.script} <b>Campaign Pitch & Objection Battlecard</b>
        </span>
        <span class="mu" style="font-size:12px;display:flex;align-items:center;gap:4px" id="battlecard-toggle-text">
          <span>Show Battlecard</span> ${IC.chevronDown}
        </span>
      </div>
      <div class="battlecard-content" id="battlecard-content" style="display:none">
        <div class="battlecard-col">
          <span class="battlecard-label">30-Second Elevator Pitch</span>
          <div style="background:var(--bg-app);border:1px solid var(--border-default);padding:12px 14px;border-radius:var(--radius-sm);font-style:italic;line-height:1.5;font-size:12.5px;color:var(--tx-primary)">
            "Hi, this is <b>[Your Name]</b> calling from the <b>${esc(evName)}</b> organizing team. We are finalizing our exhibitor floor plan for our upcoming show at <b>${esc(evWhere)}</b>. I noticed your team is active in this sector and wanted to check if you have reserved your booth presence for this edition?"
          </div>
          <div style="margin-top:10px;font-size:12px;color:var(--tx-secondary);display:flex;flex-direction:column;gap:3px">
            <div>• <b>Venue:</b> ${esc(evWhere)}</div>
            <div>• <b>Schedule:</b> ${esc(evDates)}</div>
            <div>• <b>Audience:</b> Verified B2B decision makers, buyers & specifiers</div>
          </div>
        </div>

        <div class="battlecard-col">
          <span class="battlecard-label">Common Objections & Quick Responses</span>
          
          <div style="background:var(--bg-app);border:1px solid var(--border-default);padding:10px 12px;border-radius:var(--radius-sm);margin-bottom:6px">
            <b style="font-size:12px;color:var(--tx-primary);display:block">"Just send me an email with information"</b>
            <p style="margin:3px 0 0;font-size:12px;color:var(--tx-secondary)">"Happy to send the pack right away! What's your direct email? While I have you, are you usually looking at standard 3x3 booths or custom floor space so I attach the exact specs?"</p>
          </div>

          <div style="background:var(--bg-app);border:1px solid var(--border-default);padding:10px 12px;border-radius:var(--radius-sm);margin-bottom:6px">
            <b style="font-size:12px;color:var(--tx-primary);display:block">"We don't have the budget / Too expensive"</b>
            <p style="margin:3px 0 0;font-size:12px;color:var(--tx-secondary)">"Completely understand. Many first-time exhibitors choose our turn-key shell scheme which includes walls, lighting, and power to keep costs fixed. Would a quick quote breakdown help your planning?"</p>
          </div>

          <div style="background:var(--bg-app);border:1px solid var(--border-default);padding:10px 12px;border-radius:var(--radius-sm)">
            <b style="font-size:12px;color:var(--tx-primary);display:block">"I am busy right now / Call back"</b>
            <p style="margin:3px 0 0;font-size:12px;color:var(--tx-secondary)">"Understood! When is the best time to catch you for literally 90 seconds tomorrow—morning around 10 AM or after lunch at 2 PM?"</p>
          </div>
        </div>
      </div>
    </div>`;
}
