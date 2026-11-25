import asyncHandler from 'express-async-handler';

const CACHE_MS = 15 * 60 * 1000;
const GRAPH_VERSION = 'v21.0';

let cache = { at: 0, reels: [], provider: '' };

const mapGraphReelItem = (item) => {
  const caption = String(item.caption || '').trim();
  const title = (caption.split('\n')[0] || 'Instagram Reel').slice(0, 140);

  return {
    id: `ig-${item.id}`,
    title,
    category: 'reels',
    thumbnail: item.thumbnail_url || item.media_url || '',
    videoUrl: item.media_url || '',
    permalink: item.permalink || '',
    source: 'instagram',
    timestamp: item.timestamp,
    showShopNow: false,
  };
};

const isReelMedia = (item) =>
  item?.media_product_type === 'REELS'
  || (item?.media_type === 'VIDEO' && item?.media_url);

/** Accept Dotoffe / custom API payloads or already-normalized reel objects. */
const normalizeProviderReel = (item, index = 0) => {
  if (!item || typeof item !== 'object') return null;

  if (item.videoUrl || item.video_url) {
    const videoUrl = item.videoUrl || item.video_url;
    const thumbnail = item.thumbnail || item.thumbnail_url || item.thumbnailUrl || videoUrl;
    const title = String(item.title || item.caption || item.name || 'Instagram Reel')
      .split('\n')[0]
      .slice(0, 140);

    return {
      id: String(item.id || `ext-${index}`),
      title,
      category: item.category || 'reels',
      thumbnail,
      videoUrl,
      permalink: item.permalink || item.url || item.link || '',
      source: item.source || 'instagram',
      timestamp: item.timestamp || item.created_at || item.postedAt,
      showShopNow: Boolean(item.showShopNow),
    };
  }

  if (item.media_url) {
    return mapGraphReelItem(item);
  }

  return null;
};

const extractReelList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.reels)) return payload.reels;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

const fetchFromDotoffe = async () => {
  const baseUrl = String(process.env.DOTOFFE_API_URL || '').trim();
  if (!baseUrl) return null;

  const url = new URL(baseUrl);

  const username = process.env.DOTOFFE_INSTAGRAM_USERNAME
    || process.env.INSTAGRAM_USERNAME
    || 'motogearpitstop';
  if (!url.searchParams.has('username')) {
    url.searchParams.set('username', username);
  }
  if (!url.searchParams.has('handle')) {
    url.searchParams.set('handle', username);
  }

  const headers = { Accept: 'application/json' };
  const apiKey = process.env.DOTOFFE_API_KEY;
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
    headers['X-API-Key'] = apiKey;
  }

  const apiRes = await fetch(url, { headers });
  const payload = await apiRes.json().catch(() => ({}));

  if (!apiRes.ok) {
    const message = payload?.message || payload?.error || 'Dotoffe API request failed';
    throw new Error(String(message));
  }

  const reels = extractReelList(payload)
    .map((item, index) => normalizeProviderReel(item, index))
    .filter(Boolean)
    .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

  return reels;
};

const fetchFromGraph = async () => {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const userId = process.env.INSTAGRAM_USER_ID;

  if (!accessToken || !userId) {
    return null;
  }

  const fields = [
    'id',
    'caption',
    'media_type',
    'media_url',
    'thumbnail_url',
    'permalink',
    'timestamp',
    'media_product_type',
  ].join(',');

  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${userId}/media`);
  url.searchParams.set('fields', fields);
  url.searchParams.set('limit', '50');
  url.searchParams.set('access_token', accessToken);

  const apiRes = await fetch(url);
  const payload = await apiRes.json();

  if (!apiRes.ok) {
    throw new Error(payload?.error?.message || 'Could not load Instagram reels');
  }

  return (payload.data || [])
    .filter(isReelMedia)
    .filter((item) => item.media_url || item.thumbnail_url)
    .map(mapGraphReelItem)
    .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
};

// @GET /api/instagram/reels
export const getInstagramReels = asyncHandler(async (req, res) => {
  const dotoffeUrl = String(process.env.DOTOFFE_API_URL || '').trim();
  const provider = dotoffeUrl ? 'dotoffe' : 'graph';

  if (provider === 'dotoffe' && cache.reels.length > 0 && cache.provider === provider && Date.now() - cache.at < CACHE_MS) {
    res.json({ success: true, configured: true, cached: true, provider, reels: cache.reels });
    return;
  }

  if (provider === 'graph' && cache.reels.length > 0 && cache.provider === provider && Date.now() - cache.at < CACHE_MS) {
    res.json({ success: true, configured: true, cached: true, provider, reels: cache.reels });
    return;
  }

  let reels = [];
  let activeProvider = provider;

  try {
    if (provider === 'dotoffe') {
      reels = await fetchFromDotoffe();
    } else {
      reels = await fetchFromGraph();
    }
  } catch (err) {
    if (provider === 'dotoffe') {
      const fallback = await fetchFromGraph().catch(() => null);
      if (fallback?.length) {
        reels = fallback;
        activeProvider = 'graph-fallback';
      } else {
        res.status(502);
        throw err;
      }
    } else {
      res.status(502);
      throw err;
    }
  }

  if (!reels || reels.length === 0) {
    if (provider === 'dotoffe') {
      const fallback = await fetchFromGraph().catch(() => null);
      if (fallback?.length) {
        reels = fallback;
        activeProvider = 'graph-fallback';
      }
    }

    if (!reels || reels.length === 0) {
      res.json({
        success: true,
        configured: false,
        provider: activeProvider,
        reels: [],
        message: provider === 'dotoffe'
          ? 'Dotoffe returned no reels; check DOTOFFE_API_URL and response format'
          : 'Instagram API not configured',
      });
      return;
    }
  }

  cache = { at: Date.now(), reels, provider: activeProvider };

  res.json({
    success: true,
    configured: true,
    cached: false,
    provider: activeProvider,
    reels,
  });
});