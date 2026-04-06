const VALID_LANGS = new Set(['en','fi','sv','ru','et','ar','so','fa','ku','zh','sq','th','tr','ro']);

const LANG_MAP = {
  zh: 'zh-CN',
};

function decodeHtmlEntities(text) {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

export async function translateText(text, targetLang, sourceLang = 'en') {
  if (!text || !text.trim()) return text;
  if (!VALID_LANGS.has(targetLang)) return text;
  if (targetLang === sourceLang) return text;

  const mappedTarget = LANG_MAP[targetLang] || targetLang;
  const mappedSource = LANG_MAP[sourceLang] || sourceLang;

  try {
    const params = new URLSearchParams({
      q: text,
      langpair: `${mappedSource}|${mappedTarget}`,
      de: 'admin@aimal.fi',
    });

    const res = await fetch(`https://api.mymemory.translated.net/get?${params}`);
    if (!res.ok) return text;

    const data = await res.json();
    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      return decodeHtmlEntities(data.responseData.translatedText);
    }
    return text;
  } catch (err) {
    console.error(`[translate] ${targetLang}:`, err.message);
    return text;
  }
}

export function isValidLang(lang) {
  return VALID_LANGS.has(lang);
}
