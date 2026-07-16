/**
 * Posters Data - Shared between Posters page and Home page slider
 * Add or remove images here to update both pages automatically.
 */

const defaultPosterImages = [
    {
        url: "poster1.jpg",
        title: "Universal Human Values Cell",
        subtitle: "Promoting Harmony & Human Conduct",
        link: "about.html"
    },
    {
        url: "poster2.jpg",
        title: "Inspiring Young Minds",
        subtitle: "Universal Values in Technical Education",
        link: "activities.html"
    },
    {
        url: "poster3.jpg",
        title: "Empowering Students",
        subtitle: "Join the UHV Cell Workshops",
        link: "registration.html"
    },
    {
        url: "poster4.jpg",
        title: "Expert Lectures",
        subtitle: "Insights from Distinguished Academicians",
        link: "expert-talks.html"
    },
    {
        url: "poster5.jpg",
        title: "Value Education",
        subtitle: "Transforming Society through Education",
        link: "value-education.html"
    },
    {
        url: "poster6.jpg",
        title: "Explore Our Banners",
        subtitle: "Check Out the Latest Event Posters",
        link: "posters.html"
    }
];

function loadPostersData() {
    const localPosters = localStorage.getItem('uhv_posters');
    if (!localPosters) {
        localStorage.setItem('uhv_posters', JSON.stringify(defaultPosterImages));
    }
    return localPosters ? JSON.parse(localPosters) : defaultPosterImages;
}

const posterImages = loadPostersData();
