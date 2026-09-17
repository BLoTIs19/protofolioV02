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

## Adding media

In the project form there's a drag-and-drop zone. Drop in as many images
and videos as you want at once, or click it to multi-select from your
computer. Order them with the arrow buttons; the first image becomes the
card art.

Two things happen behind the scenes, because images and videos can't be
treated the same way:

**Images and GIFs** get embedded straight into `data.js`. Large photos are
automatically resized (max 1600px) and re-encoded first, so a 6 MB
screenshot becomes a couple hundred KB. Nothing else for you to do — they
travel with `data.js`.

**Videos** (and any image still too big after compression) are *not*
embedded — a 30 MB clip would become ~40 MB of text that the browser has to
parse on every page load, and GitHub rejects files over 100 MB. Instead the
site records the path `assets/media/<filename>` and flags the file as
"needs upload". They still play normally while you're editing, using a
temporary in-browser preview.

When you click **Export site data**, any such files are listed for you with
their exact filenames, plus a **Download files** button that re-saves them
ready to commit. So the publish flow becomes:

1. **Download data.js** → paste into `data.js` in your repo.
2. **Download files** → create `assets/media/` in your repo and upload them
   there with the listed names.
3. Commit. Both parts have to land or the videos will show as broken.

If you'd rather skip step 2 for a big trailer, put it on YouTube and paste
the link under "Add by link instead" — that embeds with no file to manage.

## Publishing to GitHub Pages

1. Create a repo and upload these files.
2. Settings → Pages → Source: "Deploy from a branch" → `main` / `(root)`.
3. Visit `https://<username>.github.io/<repo>/`.

## Styling

Colors and fonts are CSS variables at the top of `style.css` (`:root`).
Change those to reskin everything.
