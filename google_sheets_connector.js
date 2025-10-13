/**
 * =================================================================================
 * Google Sheets Data Connector for Martin Simonson's Portfolio
 * =================================================================================
 *
 * Description:
 * This script fetches data from public Google Sheets and dynamically
 * populates the portfolio website.
 *
 * Instructions:
 * 1.  Replace placeholder URLs in `googleSheetUrls` with your actual URLs.
 * 2.  Ensure Google Sheet columns EXACTLY match the headers mentioned in the functions below.
 *
 */

// Global variables to hold fetched data
let fetchedBooksData = [];
let fetchedTalksData = [];
let fetchedNewsData = [];

// Configuration: Replace with your actual Google Sheet URLs
const googleSheetUrls = {
    books: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRQkpUHKd8MwQjurfSPkNia6Xfk-ydErSFgAPSiT-OzL59KYAbBxkgZdo-mSJKWtf3rulpf3037aLZD/pub?gid=0&single=true&output=csv',
    talks: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRQkpUHKd8MwQjurfSPkNia6Xfk-ydErSFgAPSiT-OzL59KYAbBxkgZdo-mSJKWtf3rulpf3037aLZD/pub?gid=692236683&single=true&output=csv',
    news: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRQkpUHKd8MwQjurfSPkNia6Xfk-ydErSFgAPSiT-OzL59KYAbBxkgZdo-mSJKWtf3rulpf3037aLZD/pub?gid=195482197&single=true&output=csv'
};

/**
 * Fetches and processes data from a Google Sheet CSV URL.
 */
async function fetchDataFromSheet(url) {
    if (!url) {
        console.warn(`No URL provided. Skipping fetch.`);
        return [];
    }
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);
        const csvText = await response.text();
        const parsed = Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true
        });
        return parsed.data;
    } catch (error) {
        console.error(`Error fetching or parsing sheet data for ${url}:`, error);
        return [];
    }
}

function transformCloudinaryUrl(url, transformation) {
        if (!url || !url.includes('/upload/')) {
            return url; // Return original URL if it's not a valid Cloudinary URL
    }
        return url.replace('/upload/', transformation);
}

// --- Population Functions ---

/**
 * Populates the books section.
 * EXPECTED HEADERS: category,type,imgSrc,titleEn,titleEs,descEn,descEs,link,availableLangs,year,editionEn,editionEs
 */
function escapeHTML(str) {
    if (!str) return '';
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Extracts the YouTube video ID from a URL.
 */
function getYoutubeVideoId(url) {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}


function populateBooks(lang = 'en') {
    if (!fetchedBooksData.length) return;

    const categories = {
        fiction: document.querySelector('#category-fiction')?.closest('.border-b')?.querySelector('.accordion-panel .grid'),
        essays: document.querySelector('#category-essays')?.closest('.border-b')?.querySelector('.accordion-panel .grid'),
        anthologies: document.querySelector('#category-anthologies')?.closest('.border-b')?.querySelector('.accordion-panel .grid'),
        translations: document.querySelector('#category-translations')?.closest('.border-b')?.querySelector('.accordion-panel .grid'),
    };

    for (const key in categories) {
        if (categories[key]) categories[key].innerHTML = '';
    }

    fetchedBooksData.forEach(book => {
        const categoryKey = book.category ? book.category.toLowerCase() : '';
        const container = categories[categoryKey];
        if (container) {
            // THIS LINE IS THE FIX: It now defaults to 'Untitled' if the title is missing.
            const title = (lang === 'es' ? book.title_es : book.title_en) || 'Untitled';
            const edition = (lang === 'es' ? book.edition_es : book.edition_en) || '';
            const purchaseLink = (lang === 'es' ? book.purchaseLink_es : book.purchaseLink_en) || '#';
            
            let thumbnailSrc;
            const originalImgSrc = (lang === 'es' ? book.imgSrc_es : book.imgSrc_en) || '';

            if (originalImgSrc) {
                // If there IS an image, use the standard transformation
                const thumbnailTransformation = '/upload/w_200,h_300,c_pad,b_auto/';
                thumbnailSrc = transformCloudinaryUrl(originalImgSrc, thumbnailTransformation);
            } else {
                // If imgSrc is BLANK, generate the typographic cover
                // Note: Replace 'YOUR_CLOUD_NAME' with your actual Cloudinary cloud name.
                const encodedTitle = encodeURIComponent(title.replace(/'/g, "\\'"));
                let fontSize = 32; // Default size
                if (title.length > 55) {
                    fontSize = 22; // Smallest size for very long titles
                    } else if (title.length > 25) {
                        fontSize = 28; // Medium size for medium titles
                    }

// Then modify the URL string to use this new variable
                    thumbnailSrc = `https://res.cloudinary.com/dzef5s7pq/image/upload/w_200,h_300,c_fill/l_text:Arial_${fontSize}_bold:${encodedTitle},co_rgb:333333,g_center,w_200,c_fit/l_text:Arial_20:Martin%20Simonson,co_rgb:333333,g_south,y_40/default_bg_kxcmab.png`;
            }
            console.log('Generated Thumbnail URL:', thumbnailSrc);

            const rawDescEn = book.description_en || '';
            const rawDescEs = book.description_es || '';
            const descEn = escapeHTML(rawDescEn);
            const descEs = escapeHTML(rawDescEs);

            container.innerHTML += `
                <a href="#" class="group text-center block book-item" 
                   data-type="${book.category}" 
                   data-img-src="${originalImgSrc}"
                   data-final-src="${thumbnailSrc}" 
                   data-title-en="${escapeHTML(book.title_en)}" 
                   data-title-es="${escapeHTML(book.title_es)}" 
                   data-desc-en="${descEn}" 
                   data-desc-es="${descEs}" 
                   data-link="${escapeHTML(purchaseLink)}"
                   data-available-langs="${escapeHTML(book.availableLangs)}" 
                   data-year="${escapeHTML(book.year)}">
                    <div class="relative inline-block overflow-hidden rounded-lg shadow-lg group-hover:shadow-xl transition-all duration-300">
                        <img src="${thumbnailSrc}" alt="Cover for ${escapeHTML(title)}" 
                             class="w-[200px] h-[300px] object-cover rounded-lg transform group-hover:scale-105 transition-transform duration-300">
                    </div>
                    <h3 class="text-lg font-bold text-gray-100 mt-4">${escapeHTML(title)}</h3>
                    <p class="text-sm text-gray-500">${escapeHTML(edition)}</p>
                </a>`;
        } else {
            console.warn(`Book category container not found for: "${book.category}"`);
        }
    });

    if (typeof initializeModalEventListeners === 'function') {
        initializeModalEventListeners();
    }
}




/**
 * Populates the talks section.
 * EXPECTED HEADERS: titleEn,titleEs,descEn,descEs,link,linkTextEn,linkTextEs
 */
/**
 * Populates the talks section.
 * EXPECTED HEADERS: titleEn,titleEs,descEn,descEs,dateEn,dateEs,congressEn,congressEs,link,linkTextEn,linkTextEs
 */
/**
 * Populates the talks section.
 * EXPECTED HEADERS: titleEn,titleEs,descEn,descEs,dateEn,dateEs,congressEn,congressEs,youtubeLink,link,linkTextEn,linkTextEs
 */
function populateTalks(lang = 'en') {
    const container = document.querySelector('#talks .space-y-8');
    if (!container || !fetchedTalksData.length) return;

    const initialItemsToShow = 3;
    const showAllBtn = document.getElementById('show-all-talks');
    const collapseAllBtn = document.getElementById('collapse-all-talks');

    showAllBtn.textContent = lang === 'es' ? 'Mostrar todas las charlas' : 'Show all talks';
    collapseAllBtn.textContent = lang === 'es' ? 'Ocultar charlas' : 'Collapse talks';

    const renderTalk = (talk) => {
        const title = lang === 'es' ? talk.title_es : talk.title_en;
        const description = lang === 'es' ? talk.description_es : talk.description_en;
        const linkText = lang === 'es' ? talk.linkText_es : talk.linkText_en;
        const date = (lang === 'es' ? talk.date_es : talk.date_en) || '';
        const congress = (lang === 'es' ? talk.congress_es : talk.congress_en) || '';
        const videoId = getYoutubeVideoId(talk.youtubeLink); // Get video ID

        let metaInfo = '';
        if (date) metaInfo += date;
        if (date && congress) metaInfo += ' | ';
        if (congress) metaInfo += congress;

        const metaHtml = metaInfo ? `<p class="text-sm text-gray-500 mt-2">${metaInfo}</p>` : '';

        // This is the HTML for the text content (Title, Meta, Description)
        const textContentHtml = `
            <div>
                <h3 class="text-lg md:text-xl font-bold text-gray-100">${title}</h3>
                ${metaHtml}
                <p class="text-gray-400 mt-1">${description} | 
                    <a href="${talk.link}" target="_blank" rel="noopener noreferrer" class="text-indigo-400 hover:underline">
                        ${linkText}
                    </a>
                </p>
            </div>
        `;

        // If a video ID exists, build the two-column layout
        if (videoId) {
            const embedHtml = `
                <div class="talks-video-wrapper">
                    <iframe 
                        src="https://www.youtube.com/embed/${videoId}" 
                        title="YouTube video player for ${escapeHTML(title)}" 
                        frameborder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowfullscreen>
                    </iframe>
                </div>
            `;

            return `
                <div class="border-b border-gray-700 pb-8 mb-8">
                    <div class="flex flex-col md:flex-row md:gap-8 items-start">
                        <div class="w-full md:w-1/2 mb-4 md:mb-0">${embedHtml}</div>
                        <div class="w-full md:w-1/2">${textContentHtml}</div>
                    </div>
                </div>
            `;
        } else {
            // If no video, return the original, simple layout
            return `<div class="border-b border-gray-700 pb-4">${textContentHtml}</div>`;
        }
    };

    const populate = (showAll = false) => {
        container.innerHTML = '';
        const itemsToRender = showAll ? fetchedTalksData : fetchedTalksData.slice(0, initialItemsToShow);
        itemsToRender.forEach(talk => container.innerHTML += renderTalk(talk));

        showAllBtn.disabled = showAll;
        collapseAllBtn.disabled = !showAll;
        showAllBtn.classList.toggle('opacity-50', showAll);
        collapseAllBtn.classList.toggle('opacity-50', !showAll);
    };

    populate(false);

    if (!showAllBtn.dataset.listenerAttached) {
        showAllBtn.addEventListener('click', () => populate(true));
        collapseAllBtn.addEventListener('click', () => populate(false));
        showAllBtn.dataset.listenerAttached = 'true';
    }
}
/**
 * Populates the news section.
 * EXPECTED HEADERS: dateEn,dateEs,titleEn,titleEs,link
 */
function populateNews(lang = 'en') {
    const container = document.querySelector('#news .space-y-8');
    if (!container || !fetchedNewsData.length) return;

    const initialItemsToShow = 3;
    const showAllBtn = document.getElementById('show-all-news');
    const collapseAllBtn = document.getElementById('collapse-all-news');
    const readMoreText = lang === 'es' ? 'Leer Más &rarr;' : 'Read More &rarr;';
    
    showAllBtn.textContent = lang === 'es' ? 'Mostrar todas las noticias' : 'Show all news';
    collapseAllBtn.textContent = lang === 'es' ? 'Ocultar noticias' : 'Collapse news';

    const renderNews = (post) => {
        const date = lang === 'es' ? post.date_es : post.date_en;
        const title = lang === 'es' ? post.title_es : post.title_en;
        const descriptionEn = post.description_en || ''; // English description
        const descriptionEs = post.description_es || ''; // Spanish description
        const imgSrc = post.imgSrc || '';
        
        return `
            <div class="border-b border-gray-700 pb-4">
                <h3 class="text-lg md:text-xl font-bold text-gray-100">${title}</h3>
                <p class="text-sm text-gray-500 mt-1">${date} | 
                    <a href="#" class="news-item-link text-indigo-400 hover:underline"
                       data-title-en="${escapeHTML(post.title_en)}"
                       data-title-es="${escapeHTML(post.title_es)}"
                       data-date-en="${escapeHTML(post.date_en)}"
                       data-date-es="${escapeHTML(post.date_es)}"
                       data-img-src="${escapeHTML(imgSrc)}"
                       data-description-en="${escapeHTML(descriptionEn)}"
                       data-description-es="${escapeHTML(descriptionEs)}">
                        ${readMoreText}
                    </a>
                </p>
            </div>`;
    };

    const populate = (showAll = false) => {
        container.innerHTML = '';
        const itemsToRender = showAll ? fetchedNewsData : fetchedNewsData.slice(0, initialItemsToShow);
        itemsToRender.forEach(post => container.innerHTML += renderNews(post));
    };

    populate(false);

    showAllBtn.addEventListener('click', () => populate(true));
    collapseAllBtn.addEventListener('click', () => populate(false));
}



/**
 * Main function to initialize all dynamic content.
 */
/**
 * Main function to initialize all dynamic content.
 */
async function initializeDynamicContent() {
    console.log("Initializing dynamic content...");
    const cacheDuration = 3600 * 1000; // Cache data for 1 hour (in milliseconds)

    // A helper function to get data from cache or fetch it
    async function getOrFetchData(key, url) {
        const cachedItem = localStorage.getItem(key);
        if (cachedItem) {
            const { timestamp, data } = JSON.parse(cachedItem);
            // Check if the cache is still valid
            if (Date.now() - timestamp < cacheDuration) {
                console.log(`Loading ${key} data from cache.`);
                return data; // Use cached data
            }
        }
        // If no cache or cache is old, fetch new data
        console.log(`Fetching new data for ${key}.`);
        const data = await fetchDataFromSheet(url);
        // Save the new data and a timestamp to the cache
        localStorage.setItem(key, JSON.stringify({ timestamp: Date.now(), data }));
        return data;
    }

    // Fetch all data in parallel using our new caching function
    [fetchedBooksData, fetchedTalksData, fetchedNewsData] = await Promise.all([
        getOrFetchData('booksCache', googleSheetUrls.books),
        getOrFetchData('talksCache', googleSheetUrls.talks),
        getOrFetchData('newsCache', googleSheetUrls.news)
    ]);

    // --- DEBUGGING STEP ---
    console.log("Books data:", fetchedBooksData);
    console.log("Talks data:", fetchedTalksData);
    console.log("News data:", fetchedNewsData);
    // --- END DEBUGGING STEP ---

    const currentLang = localStorage.getItem('language') || 'en';
    populateBooks(currentLang);
    populateTalks(currentLang);
    populateNews(currentLang);

    console.log("Dynamic content initialization complete.");
}

document.addEventListener('DOMContentLoaded', initializeDynamicContent);