// ==========================================================================
// AU Campaign CRM — Google Gemini AI Integration Service
// Free-Tier Zero Cost Call Summarization Engine (Gemini 1.5/2.0 Flash)
// ==========================================================================

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

export const isAiConfigured = () => !!getGeminiApiKey();

/**
 * Generate a sharp 2-3 bullet point call summary using Gemini Flash API
 * @param {Object} callData - details of the lead and interaction
 * @param {string} [customApiKey] - optional override key
 * @returns {Promise<{ ok: boolean, summary?: string, error?: string }>}
 */
export async function generateCallSummary(callData, customApiKey = null) {
  const apiKey = (customApiKey || getGeminiApiKey()).trim();

  if (!apiKey) {
    return {
      ok: false,
      error: 'NO_KEY',
      message: 'Google Gemini API Key is not configured. Please add your free key in Settings.'
    };
  }

  // Construct structured context for the AI
  const promptParts = [
    `Company: ${callData.companyName || 'Lead'}`,
    callData.contactName ? `Spoken with: ${callData.contactName}` : null,
    callData.status ? `Call Outcome / Disposition: ${callData.status}` : null,
    callData.spaceType ? `Stand Type: ${callData.spaceType}` : null,
    callData.spaceSize ? `Stand Size: ${callData.spaceSize}` : null,
    callData.customerRequirements ? `Customer Requirements: ${callData.customerRequirements}` : null,
    callData.notes ? `Agent Interaction Notes: ${callData.notes}` : null,
    callData.otherExpos ? `Other Expos: ${callData.otherExpos}` : null,
    callData.exhibitFrequency ? `Exhibition Frequency: ${callData.exhibitFrequency}` : null
  ].filter(Boolean).join('\n');

  if (!callData.notes && !callData.customerRequirements && !callData.status) {
    return {
      ok: false,
      error: 'NO_CONTENT',
      message: 'Please enter notes or requirements first to generate a summary.'
    };
  }

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
        parts: [
          { text: `${systemInstruction}\n\nCall Details:\n${promptParts}` }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 150
    }
  };

  try {
    // Try Gemini 1.5 Flash (or 2.0 Flash)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      const errMsg = errJson?.error?.message || `HTTP ${res.status}`;
      if (res.status === 429) {
        return {
          ok: false,
          error: 'QUOTA_EXCEEDED',
          message: 'Gemini free rate limit reached (15 requests/minute). Please wait 30 seconds and retry.'
        };
      }
      if (res.status === 400 || res.status === 403) {
        return {
          ok: false,
          error: 'INVALID_KEY',
          message: 'Invalid Google Gemini API Key. Please verify your key in Settings.'
        };
      }
      return {
        ok: false,
        error: 'API_ERROR',
        message: `Gemini API Error: ${errMsg}`
      };
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!text) {
      return {
        ok: false,
        error: 'EMPTY_RESPONSE',
        message: 'AI returned an empty response.'
      };
    }

    return {
      ok: true,
      summary: text
    };
  } catch (err) {
    return {
      ok: false,
      error: 'NETWORK_ERROR',
      message: 'Network error connecting to Google Gemini. Please check your internet connection.'
    };
  }
}
