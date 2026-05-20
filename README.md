# LaTeX Resume → Professional Adaptive Website

You maintain only one file:

```text
resume.tex
```

Every time you push changes to GitHub, the workflow:

1. Compiles your LaTeX resume into `resume.pdf`
2. Reads your LaTeX sections
3. Builds a responsive professional website
4. Deploys it to GitHub Pages

## How to update your existing repo

Replace these files in your GitHub repo:

```text
site/index.html
site/style.css
site/script.js
scripts/build_site.py
.github/workflows/build-resume-site.yml
```

Then commit the changes.

## How adaptive sections work

Any section you add in LaTeX becomes a website section automatically:

```tex
\section{Certifications}
```

This adds:

- Certifications section
- Certifications navigation item
- Certifications overview card

## Recommended LaTeX format

For best website output, use clean semantic sections:

```tex
\section{Experience}

\textbf{Asset Officer} \hfill 2025 -- Present\\
\textit{IDBI Bank}
\begin{itemize}
  \item Worked on credit appraisal, MSME loans, disbursement, and portfolio monitoring.
\end{itemize}
```

## GitHub Pages setting

Go to:

```text
Settings → Pages → Build and deployment → Source → GitHub Actions
```