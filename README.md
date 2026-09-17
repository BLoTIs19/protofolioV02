# Belal Swilam — Portfolio

A static portfolio site: plain HTML, CSS and JS. No framework, no build
step, no server. Designed to be hosted free on GitHub Pages.

## Files

- `index.html` — page structure
- `style.css` — all styling
- `data.js` — **all your content**: your bio text and every project
- `script.js` — rendering, admin editing, export
- `assets/` — your screenshots, GIFs and video files

## The one thing to understand

GitHub Pages serves **static files only**. There is no database. So when
you edit text or add a project in the browser, that change is saved in
*your browser*, not on the internet — which is exactly why the projects
you added before weren't showing up for other people.

The fix is the **Export site data** button in the orange admin bar:

1. Log in, make all your changes (text edits, add/edit/delete projects).
2. Click **Export site data** → **Download data.js**.
3. In your GitHub repo, open `data.js` → pencil icon → select all →
   paste the new contents → **Commit changes**.
4. Wait about a minute. Your live site now shows the changes to everyone.

Until you do step 3, changes exist only on your machine.

## Admin

- Username: `blotis`
- Password: the one you chose (stored as a SHA-256 hash in `script.js`, not
  as plain text)

To change it, edit `ADMIN_USERNAME` in `script.js` and replace
`ADMIN_PASSWORD_HASH` with the hash of your new password
(`echo -n "newpassword" | shasum -a 256`).

**This is not real security.** With no server, the check runs in the
visitor's browser and someone using dev tools can bypass it. It stops
casual tampering, nothing more. Nobody can change your *published* site
without access to your GitHub account, though — that's what actually
protects your content.

## What you can do while logged in

- **Edit any text** — click directly on your name, role, intro, summary,
  about, or footer and type. Dashed orange outlines show what's editable.
- **Add a project** — the green + button, bottom right.
- **Edit or delete a project** — buttons appear on each card.
- **Add media** — images, GIFs, `.mp4`/`.webm` videos, or YouTube links.
  Paste a URL/path, or upload images straight from your computer.
- **Discard local changes** — reverts to whatever is published in `data.js`.

## Media tips

- Screenshots and GIFs: commit to `assets/`, reference as `assets/name.gif`.
- Videos: YouTube links are best — paste any YouTube URL and it embeds.
  Self-hosted `.mp4` works too but bloats the repo.
- Uploaded images get embedded into `data.js` as base64. Convenient, but
  keep them small — files over 3 MB are rejected, and several large ones
  will make your site slow to load.

## Publishing to GitHub Pages

1. Create a repo and upload these files.
2. Settings → Pages → Source: "Deploy from a branch" → `main` / `(root)`.
3. Visit `https://<username>.github.io/<repo>/`.

## Styling

Colors and fonts are CSS variables at the top of `style.css` (`:root`).
Change those to reskin everything.
