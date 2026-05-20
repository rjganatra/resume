# LaTeX Resume → Adaptive Website

Maintain one file: `resume.tex`.

When you push changes to GitHub, the workflow will:

1. Compile `resume.tex` into `resume.pdf`
2. Parse the LaTeX sections
3. Generate an interactive responsive website
4. Deploy it to GitHub Pages

## How to use

1. Create a new GitHub repository.
2. Upload all files from this starter folder.
3. Replace the sample `resume.tex` with your actual LaTeX resume.
4. Go to **Settings → Pages**.
5. Under **Build and deployment**, select **GitHub Actions**.
6. Push to the `main` branch.
7. Open the deployed Pages link from the workflow summary.

## How adaptive sections work

Any new LaTeX section like this:

```tex
\section{Certifications}
```

will automatically become a new website section and navbar item.

The parser supports:

- `\section{...}`
- `\section*{...}`
- `\cvsection{...}`
- `\resumeSection{...}`
- `\resumeSubheading{...}{...}{...}{...}`
- Standard `itemize` bullets
- Simple `\textbf{Title} \hfill Date` resume entries

## Recommended LaTeX style

For the cleanest website output, keep sections semantic:

```tex
\section{Experience}
\textbf{Asset Officer} \hfill 2025 -- Present\\
\textit{IDBI Bank}
\begin{itemize}
  \item Your resume point here.
\end{itemize}
```

## Files

```text
resume.tex                         Your only resume source
scripts/build_site.py              LaTeX parser and website generator
site/index.html                    Website shell
site/style.css                     Responsive website design
site/script.js                     Dynamic rendering
.github/workflows/build-resume-site.yml
```