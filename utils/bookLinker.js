// utils/bookLinker.js

const cache = new Map();

export async function getBookLinks(title, author) {
  const cacheKey = `${title}|${author}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  let result;

  try {
    // 1. Check if the book is in the public domain via Gutendex (Project Gutenberg)
    const query = encodeURIComponent(`${title} ${author}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8-second timeout

    const response = await fetch(`https://gutendex.com/books?search=${query}`, {
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Gutendex API responded with status ${response.status}`);
    }

    const data = await response.json();

    // If Gutendex returns a result, it's likely public domain
    if (data.results && data.results.length > 0) {
      const book = data.results[0];
      const formats = book.formats;

      // Prioritize EPUB, then HTML, then plain text
      const epubUrl = formats['application/epub+zip'];
      const htmlUrl = formats['text/html'];
      const textUrl = formats['text/plain'];

      const readUrl = epubUrl || htmlUrl || textUrl;

      if (readUrl) {
        result = {
          type: 'read',
          source: 'Project Gutenberg',
          url: readUrl,
          title: book.title,
          author: book.authors.map(a => a.name).join(', ')
        };
      }
    }

    // 2. If not public domain, generate borrow/buy links
    // Note: Replace YOUR_AMAZON_TAG and YOUR_BOOKSHOP_ID with real affiliate IDs later
    if (!result) {
      const searchQuery = encodeURIComponent(`${title} ${author}`);

      result = {
        type: 'buy',
        libbyUrl: `https://libbyapp.com/search/${searchQuery}`,
        amazonUrl: `https://www.amazon.com/s?k=${searchQuery}&tag=YOUR_AMAZON_TAG`,
        bookshopUrl: `https://bookshop.org/search?keywords=${searchQuery}&aid=YOUR_BOOKSHOP_ID`
      };
    }

  } catch (error) {
    // AbortError = our timeout fired, which just means "not in public domain" — not a real error
    if (error.name !== 'AbortError') {
      console.error(`Error fetching links for "${title}" by ${author}:`, error.message);
    }

    // Fallback so the frontend doesn't break
    result = {
      type: 'buy',
      libbyUrl: `https://libbyapp.com/search/${encodeURIComponent(`${title} ${author}`)}`,
      amazonUrl: `https://www.amazon.com/s?k=${encodeURIComponent(`${title} ${author}`)}`,
      bookshopUrl: `https://bookshop.org/search?keywords=${encodeURIComponent(`${title} ${author}`)}`
    };
  }

  // Save to cache and return
  cache.set(cacheKey, result);
  return result;
}