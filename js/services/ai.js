// ==========================================================================
// AU Campaign CRM — Smart Call Summarization Service
// 100% Free Lifetime Local Engine (Zero API Key & Zero Backend Required)
// With optional Google Gemini Flash Cloud Integration
// ==========================================================================

import { formatFriendlyDateTime } from '../utils/dates.js';

const KEY_STORAGE = 'aucrm_gemini_key';

export const getGeminiApiKey = () => {
  try {
    return (localStorage.getItem(KEY_STORAGE) || '').trim();
  } catch (e) {
    return '';
  }
};

export const setGeminiApiKey = key => {
  try {
    const clean = (key || '').trim();
    if (!clean) {
      localStorage.removeItem(KEY_STORAGE);
    } else {
      localStorage.setItem(KEY_STORAGE, clean);
    }
    return true;
  } catch (e) {
    return false;
  }
};

// Always configured because the built-in smart engine is built right into the CRM!
export const isAiConfigured = () => true;

/**
 * Smart Built-in Local Call Summarizer
 * Generates sharp, professional 3-bullet takeaways instantly with 0 external API calls
 * @param {Object} callData
 * @returns {string}
 */
export function generateSmartSummary(callData) {
  const req = (callData.customerRequirements || '').trim();
  const notes = (callData.notes || '').trim();
  const status = callData.status || 'Active';
  const spaceType = (callData.spaceType || '').trim();
  const spaceSize = (callData.spaceSize || '').trim();
  const contact = (callData.contactName || '').trim();
  const company = (callData.companyName || 'Exhibitor').trim();
  const cb = callData.cb || '';

  // 1. Bullet 1: Need / Space Specification
  let needBullet = '';
  const spaceParts = [];
  if (spaceSize) spaceParts.push(spaceSize);
  if (spaceType && spaceType !== '-' && spaceType !== 'Not exhibiting') spaceParts.push(spaceType);

  if (req) {
    if (spaceParts.length) {
      needBullet = `• Need: ${spaceParts.join(' ')} · ${req}`;
    } else {
      needBullet = `• Need: ${req}`;
    }
  } else if (spaceParts.length) {
    needBullet = `• Need: Stand build & display for ${spaceParts.join(' ')}`;
  } else if (notes) {
    needBullet = `• Need: Inquiry for ${company} (${status})`;
  } else {
    needBullet = `• Need: Standard exhibition booth inquiry for ${company}`;
  }

  // 2. Bullet 2: Prospect Stance & Sentiment
  let stanceBullet = '';
  const notesLower = notes.toLowerCase();
  const contactRef = contact ? `with ${contact}` : 'with decision maker';

  if (status === 'Appointment') {
    stanceBullet = `• Prospect Stance: Confirmed sales appointment ${contactRef} to review stand proposal and quotation.`;
  } else if (status === 'Interested') {
    if (notesLower.includes('quote') || notesLower.includes('pricing') || notesLower.includes('cost') || notesLower.includes('budget')) {
      stanceBullet = `• Prospect Stance: Actively engaged; requested quotation and cost breakdown.`;
    } else if (notesLower.includes('pack') || notesLower.includes('email') || notesLower.includes('brochure') || notesLower.includes('catalog')) {
      stanceBullet = `• Prospect Stance: Receptive to stand proposal; requested info pack and portfolio via email.`;
    } else {
      stanceBullet = `• Prospect Stance: Positive engagement ${contactRef}; evaluating stand options for upcoming show.`;
    }
  } else if (status === 'Callback') {
    if (notesLower.includes('meeting') || notesLower.includes('busy')) {
      stanceBullet = `• Prospect Stance: In meeting / busy during call; requested callback at designated time.`;
    } else if (notesLower.includes('gatekeeper') || notesLower.includes('reception') || notesLower.includes('blocked')) {
      stanceBullet = `• Prospect Stance: Reached gatekeeper/reception; follow-up scheduled to connect with primary contact.`;
    } else {
      stanceBullet = `• Prospect Stance: Open to discussion; requested scheduled follow-up call to review requirements.`;
    }
  } else if (status === 'Not Interested') {
    if (notesLower.includes('budget')) {
      stanceBullet = `• Prospect Stance: Budget constraints cited; not commissioning custom build for this event.`;
    } else if (notesLower.includes('own') || notesLower.includes('reusing')) {
      stanceBullet = `• Prospect Stance: Reusing existing stand setup; not requiring new construction at this time.`;
    } else {
      stanceBullet = `• Prospect Stance: Not proceeding with stand construction for this exhibition cycle.`;
    }
  } else if (status === 'No Answer') {
    stanceBullet = `• Prospect Stance: No answer / direct contact on this attempt; lead remains active in outreach queue.`;
  } else if (status === 'Wrong Number') {
    stanceBullet = `• Prospect Stance: Contact details or telephone line unreachable on file.`;
  } else {
    stanceBullet = `• Prospect Stance: Telemarketing interaction logged ${contactRef}; record updated.`;
  }

  // 3. Bullet 3: Recommended Next Step
  let nextBullet = '';
  if (status === 'Appointment') {
    nextBullet = `• Next Action: Prepare 3D stand visual concept, floorplan breakdown, and formal quotation.`;
  } else if (status === 'Callback') {
    if (cb) {
      nextBullet = `• Next Action: Follow up on ${formatFriendlyDateTime(cb)} to confirm requirements and stand brief.`;
    } else {
      nextBullet = `• Next Action: Re-contact prospect to confirm stand space booking and design brief.`;
    }
  } else if (status === 'Interested') {
    nextBullet = `• Next Action: Dispatch information pack and schedule quote presentation with sales team.`;
  } else if (status === 'Not Interested') {
    nextBullet = `• Next Action: Archive lead for this campaign; review for subsequent exhibition cycles.`;
  } else if (status === 'No Answer') {
    nextBullet = `• Next Action: Re-dial prospect during alternate calling window (morning / afternoon).`;
  } else if (status === 'Wrong Number') {
    nextBullet = `• Next Action: Research alternative telephone or contact person via company website / directory.`;
  } else {
    nextBullet = `• Next Action: Continue scheduled outreach in accordance with campaign pacer.`;
  }

  return [needBullet, stanceBullet, nextBullet].filter(Boolean).join('\n');
}

/**
 * Generate Call Summary:
 * Uses Google Gemini API if a key is provided, or uses the instant smart local engine (default, 100% free forever)
 * @param {Object} callData - details of the lead and interaction
 * @param {string} [customApiKey] - optional override key
 * @returns {Promise<{ ok: boolean, summary: string, source: 'local'|'gemini' }>}
 */
export async function generateCallSummary(callData, customApiKey = null) {
  const apiKey = (customApiKey || getGeminiApiKey()).trim();

  // If no Gemini key is provided, use the instant smart local summarizer (100% free, 0 API calls)
  if (!apiKey) {
    const summary = generateSmartSummary(callData);
    return {
      ok: true,
      summary,
      source: 'local'
    };
  }

  // If a Gemini API key is configured, use Gemini with smart fallback
  const promptParts = [
    `Company: ${callData.companyName || 'Lead'}`,
    callData.contactName ? `Spoken with: ${callData.contactName}` : null,
    callData.status ? `Call Outcome / Disposition: ${callData.status}` : null,
    callData.spaceType ? `Stand Type: ${callData.spaceType}` : null,
    callData.spaceSize ? `Stand Size: ${callData.spaceSize}` : null,
    callData.customerRequirements ? `Customer Requirements: ${callData.customerRequirements}` : null,
    callData.notes ? `Agent Interaction Notes: ${callData.notes}` : null
  ].filter(Boolean).join('\n');

  const systemInstruction = `You are an expert sales analyst for an exhibition stand design & construction CRM in Australia.
Analyze this outbound telemarketing call log and produce a crisp, professional 2 to 3 bullet-point summary (maximum 40 words total).
Format strictly as:
• Need: [brief stand/space requirement]
• Prospect Stance: [decision maker mindset, key objection, or interest level]
• Next Step: [concrete follow-up action]
Do NOT output intro phrases, conversational filler, or greetings. Output only the bullet points.`;

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [{ text: `${systemInstruction}\n\nCall Details:\n${promptParts}` }]
      }
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 150
    }
  };

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (text) {
        return {
          ok: true,
          summary: text,
          source: 'gemini'
        };
      }
    }
  } catch (e) {}

  // Fallback to smart local summary if cloud call fails
  return {
    ok: true,
    summary: generateSmartSummary(callData),
    source: 'local'
  };
}
