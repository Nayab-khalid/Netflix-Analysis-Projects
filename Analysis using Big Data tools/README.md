# Big Data Analytics on Netflix Dataset

[![Apache Spark](https://img.shields.io/badge/Apache%20Spark-3.x-E25A1C?logo=apachespark&logoColor=white)](https://spark.apache.org/)
[![Apache Hive](https://img.shields.io/badge/Apache%20Hive-HDFS-FDEE21?logo=apachehive&logoColor=black)](https://hive.apache.org/)
[![Python](https://img.shields.io/badge/Python-3.x-3776AB?logo=python&logoColor=white)](https://python.org)
[![Jupyter](https://img.shields.io/badge/Jupyter-Notebook-F37626?logo=jupyter&logoColor=white)](https://jupyter.org)

## Project Overview
This repository contains the Big Data Analytics final project analyzing the **Netflix Movies and TV Shows Dataset**. Built using **Apache Spark (PySpark)**, **Apache Hive / HDFS**, and **Python**, the project demonstrates end-to-end big data processing including distributed data ingestion, data cleaning, parquet format storage, external Hive table creation, analytical SQL querying, windowing functions, and visualization.


## Repository Structure

```
big-data-analytics/
│
├── README.md                           # Main project documentation
│
├── notebooks/
│   └── big-data-analytics.ipynb        # Jupyter Notebook containing Spark & Hive analysis
│
├── docs/
│   ├── project-report.pdf              # Comprehensive project report
│   └── presentation.pptx               # Project presentation slides
│
├── data/
│   └── README.md                       # Information regarding the dataset & HDFS setup
│
└── results/                            # Output directory for exported query results & charts
```

---

## Technology Stack & Prerequisites

- **Distributed Data Engine:** Apache Spark (PySpark SQL & Window Functions)
- **Data Warehouse / Storage:** Apache Hive, Hadoop HDFS
- **Storage Format:** Apache Parquet
- **Analytics & Visualizations:** Python (Pandas, Matplotlib)
- **Environment:** Jupyter Notebook

---

## Key Pipeline Steps & Implementation

1. **Spark Ingestion:** Initialized `SparkSession` with Hive support and read `netflix_titles.csv` directly from HDFS (`hdfs://localhost:9000/netflix_project/netflix_titles.csv`).
2. **Data Cleaning & Preprocessing:**
   - Imputed missing values (`director`, `cast`, `country`, `rating`).
   - Deduplicated dataset entries.
   - Formatted `date_added` to standard `DATE` type.
   - Derived engineered columns: `added_year`, `added_month`, and `content_age`.
3. **Parquet Export & Hive Integration:**
   - Overwrote cleaned data into Parquet format on HDFS.
   - Created external Hive table `netflix_data` pointing to the cleaned Parquet location.
4. **SQL Queries & Advanced Analytics:**
   - Content distribution analysis (Movies vs. TV Shows).
   - Top 10 content categories & top 10 producing countries.
   - Filtering recent content released $\ge$ 2020.
   - Yearly release trends grouped by content type.
   - Window analytics calculating year-over-year content growth rates.
   - Content segmentation into *Recent*, *Modern*, and *Classic* cohorts.

---

## How to Run

1. **HDFS Dataset Setup:** Ensure Hadoop HDFS is running and place `netflix_titles.csv` into `/netflix_project/`.
2. **Launch Notebook:**
   ```bash
   jupyter notebook notebooks/big-data-analytics.ipynb
   ```
3. **Execute Cells:** Run all cells in sequence to initialize the Spark session, process the dataset, manage Hive tables, and view analytical outputs.

---

## Documentation & Presentation
- Detailed write-up: [`docs/project-report.pdf`](docs/project-report.pdf)
- Presentation slides: [`docs/presentation.pptx`](docs/presentation.pptx)
