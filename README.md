# Birthday party site

A one-page invitation. GitHub Pages serves the files in `public/`. Supabase stores RSVPs and guest photos. Anyone with the link can open the page, RSVP, and upload a picture. There is no password and no accounts.

The top of the page is the flyer image, `public/CADENDAYCADENDAY.png`. RSVP and photos sit underneath it.

## Fill in the invitation

Edit `public/party.config.js`. That file is the only place for the party copy and the Supabase keys.

```js
window.PARTY = {
  title: "Alex's Birthday",
  datetime: "2026-10-18T19:00:00",
  place: "Our apartment",
  mapsUrl: "https://maps.google.com/?q=...",
  hostNote: "Come hungry. No gifts.",
  supabaseUrl: "https://YOUR_PROJECT.supabase.co",
  supabaseAnonKey: "YOUR_ANON_KEY"
};
```

- `title` is the browser tab title. The picture guests see is `public/CADENDAYCADENDAY.png`. Replace that file to change the flyer.
- Leave `mapsUrl` as `https://maps.google.com/?q=...` until you have a real link. The maps link stays hidden under the flyer while that placeholder is there.
- In Supabase, open **Project Settings → API**. Copy the project URL into `supabaseUrl` and the **anon public** key into `supabaseAnonKey`.
- Do not put the service role key in this file.

Until those two Supabase values are filled in, the invitation still shows. Sending an RSVP or a photo explains that the keys need to be filled in.

The anon key will be visible in the page source. That is expected. Row Level Security is what blocks edits and deletes. Guests can add and read rows. They cannot change or remove them. You moderate from the Supabase dashboard.

## Set up Supabase

Create one free Supabase project.

1. Open the **SQL Editor**, start a new query, and paste the whole file `supabase/setup.sql`.
2. Run it.

The script creates:

- `rsvps` — name, yes / no / maybe, guest count (1–10), optional note
- `photos` — name, optional caption, storage path
- a public bucket named `party-photos`, about 5 MB per file, image types only (`image/jpeg`, `image/png`, `image/webp`, `image/gif`)

The `anon` role gets `select` and `insert` only. There is no `update` or `delete` policy for anon. You can run the script again; it replaces policies and updates the bucket without dropping your data.

The page resizes photos in the browser to a max edge of 1600px and uploads a JPEG, so phone pictures do not fill the free 1 GB as fast.

## Publish with GitHub Pages

Pushes to `main` run `.github/workflows/pages.yml`, which publishes only the `public/` folder. You can also run that workflow by hand from the Actions tab.

1. Push the repo to GitHub.
2. In the repo, set Settings → Pages → Build and deployment → Source to **GitHub Actions**.
3. After the first successful run, the site URL is `https://<username>.github.io/<repository-name>/` (or `https://<username>.github.io/` if the repo is `<username>.github.io`). The Actions deploy step also prints the URL.
4. Share that URL. Anyone who has it can RSVP and upload.

After you change the note or the keys, push to `main` again. The next run updates the live site.

## Preview on your computer

From the repo folder:

```bash
python -m http.server 8765 --directory public
```

Open `http://localhost:8765`. Relative links are what the live site uses, so keep the preview at the root of `public/` rather than opening `index.html` as a file.

## Delete junk

The dashboard is logged in as the project owner and can delete even though guests cannot.

1. **Table Editor → rsvps** — delete a row to remove an RSVP. The coming count only adds `guest_count` for rows marked yes.
2. **Table Editor → photos** — delete a row to remove it from the gallery.
3. **Storage → party-photos** — delete the file. The file name is the row's `storage_path` (a `.jpg`). Deleting the table row does not delete the file, so remove both.

If an upload reaches storage and the gallery row fails, the JPEG can sit in the bucket with no row. Delete that file from Storage.
