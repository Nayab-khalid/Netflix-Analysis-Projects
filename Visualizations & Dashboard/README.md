# Netflix Content Analytics Dashboard

An interactive, web-based data visualization system built with **D3.js** that provides meaningful insights from the Netflix Titles dataset (8,800+ titles). This project was developed as a semester project for the Data Visualization course.

![Dashboard Preview](https://img.shields.io/badge/D3.js-v7-orange?style=flat-square) ![License](https://img.shields.io/badge/License-MIT-green?style=flat-square) ![Status](https://img.shields.io/badge/Status-Complete-brightgreen?style=flat-square)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Dataset](#dataset)
- [Visualizations](#visualizations)
- [Interactive Features](#interactive-features)
- [How to Run](#how-to-run)
- [Project Structure](#project-structure)
- [Technologies Used](#technologies-used)
- [Design Decisions](#design-decisions)
- [Authors](#authors)

---

## Overview

This dashboard enables users to explore Netflix's content library through five interconnected D3.js visualizations. Users can filter by year, country, genre, content type, and rating — with all charts updating in real-time through a cross-filtering architecture.

The system demonstrates practical application of interactive visualization techniques including:
- Marks and channels (position, color, size, shape)
- Focus + context (brush & zoom)
- Hierarchical visualization (treemap)
- Geographic visualization (choropleth)
- Linked/coordinated views (cross-filtering)

---

## Features

- **Five Interactive D3.js Visualizations** with smooth animated transitions
- **Cross-Filtering**: Click on any chart element to filter all other charts
- **Netflix-Inspired Dark Theme** with glassmorphism design
- **Responsive Layout** that adapts to different screen sizes
- **Rich Tooltips** with detailed information on hover
- **Brush & Zoom** interactions on timeline and map
- **Built-in Report** (`report.html`) — printable design documentation
- **Built-in Slides** (`slides.html`) — browser-based presentation deck
- **Zero Dependencies** — pure HTML/CSS/JS, no build tools required

---

## Dataset

**Netflix Titles Dataset** — 8,807 titles (6,131 Movies + 2,676 TV Shows)

| Column | Description |
|--------|-------------|
| `show_id` | Unique identifier |
| `type` | Movie or TV Show |
| `title` | Title of the content |
| `director` | Director name(s) |
| `cast` | Cast members |
| `country` | Country of production |
| `date_added` | Date added to Netflix |
| `release_year` | Year of original release |
| `rating` | Content rating (TV-MA, PG-13, etc.) |
| `duration` | Length in minutes or seasons |
| `listed_in` | Genre categories |
| `description` | Content synopsis |

**Source**: Kaggle — Netflix Movies and TV Shows dataset

---

## Visualizations

### 1. Content Growth Timeline (Stacked Area Chart)
Shows the number of Movies and TV Shows added to Netflix each year (2008–2021). Features a brush control for selecting a year range that cross-filters all other charts.

### 2. Global Content Map (Choropleth)
World map colored by the number of Netflix titles produced per country. Supports zoom, pan, and click-to-filter by country.

### 3. Genre Landscape (Zoomable Treemap)
Hierarchical visualization of genre distribution. Click any genre to zoom in and see detailed breakdowns. Breadcrumb navigation for easy exploration.

### 4. Content Ratings (Grouped Bar Chart)
Side-by-side comparison of content ratings for Movies vs TV Shows. Click any bar to filter by that rating.

### 5. Duration Distribution (Histogram + Box Plot)
Distribution of content duration with statistical overlay (median, quartiles). Toggle between Movies (minutes) and TV Shows (seasons).

---

## Interactive Features

| Feature | Description |
|---------|-------------|
| **Cross-Filtering** | Clicking a chart element filters all other visualizations |
| **Brush & Zoom** | Select time ranges on the timeline; zoom/pan on the map |
| **Tooltips** | Hover over any data point for detailed information |
| **Type Toggle** | Filter between Movies, TV Shows, or All content |
| **Dropdowns** | Filter by country, rating, or genre |
| **Year Slider** | Dual-range slider for year selection |
| **Treemap Zoom** | Click to drill down into genre hierarchies |
| **Reset Button** | Clear all filters and return to the full dataset |

---

## How to Run

### Option 1: Direct File Open
Simply open `index.html` in a modern web browser (Chrome, Firefox, Edge).

> **Note**: Due to CORS restrictions with CSV loading, you may need to use a local server (see Option 2).

### Option 2: Local Development Server (Recommended)

Using Python:
```bash
# Python 3
cd DV-final
python -m http.server 8000
# Open http://localhost:8000 in your browser
```

Using Node.js:
```bash
npx serve .
# Open the URL shown in terminal
```

Using VS Code:
1. Install the "Live Server" extension
2. Right-click `index.html` → "Open with Live Server"

### Option 3: GitHub Pages
The project is deployed at: [Your GitHub Pages URL]

---

## Project Structure

```
DV-final/
├── index.html               # Main dashboard application
├── report.html               # Design documentation report
├── slides.html               # Presentation slide deck
├── README.md                 # This file
├── css/
│   ├── dashboard.css         # Dashboard theme and layout
│   ├── report.css            # Report print styles
│   └── slides.css            # Slide deck styles
├── js/
│   ├── app.js                # Application controller & state manager
│   ├── data-loader.js        # CSV parsing and data preprocessing
│   ├── utils.js              # Color palettes, formatters, helpers
│   ├── tooltip.js            # Shared tooltip component
│   ├── timeline.js           # Stacked Area Chart visualization
│   ├── genre-treemap.js      # Zoomable Treemap visualization
│   ├── map.js                # Choropleth Map visualization
│   ├── ratings.js            # Grouped Bar Chart visualization
│   └── duration.js           # Histogram + Box Plot visualization
└── data/
    └── netflix_titles.csv    # Netflix dataset (8,807 titles)
```

---

## Technologies Used

| Technology | Purpose |
|-----------|---------|
| **D3.js v7** | All data visualizations, scales, axes, transitions |
| **TopoJSON** | Geographic data for the world choropleth map |
| **HTML5** | Semantic document structure |
| **CSS3** | Glassmorphism theme, CSS Grid layout, animations |
| **JavaScript (ES6+)** | Application logic, DOM manipulation, event handling |
| **Google Fonts (Inter)** | Typography |

---

## Design Decisions

- **Dark Theme**: Netflix-inspired design (#141414) reduces eye strain and makes chart colors pop
- **Glassmorphism Cards**: Modern, layered UI with `backdrop-filter: blur()` effects
- **Cross-Filtering Architecture**: All charts are linked through a central state manager for seamless data exploration
- **Color Palette**: Red (#E50914) for movies, green (#46d369) for TV shows — matching Netflix's brand language
- **Responsive Grid**: CSS Grid with breakpoints ensures usability on tablets and smaller screens


## License

This project is created for educational purposes as part of the Data Visualization course.
"# Netflix-Analytics" 
"# Netflix-Analytics" 
