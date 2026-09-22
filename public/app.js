(function () {
  const party = window.PARTY || {};
  const MAX_EDGE = 1600;
  const JPEG_QUALITY = 0.82;
  const MAX_UPLOAD_BYTES = 5242880;

  const els = {
    title: document.getElementById("party-title"),
    maps: document.getElementById("maps-link"),
    rsvpForm: document.getElementById("rsvp-form"),
    rsvpNotice: document.getElementById("rsvp-notice"),
    rsvpHint: document.getElementById("rsvp-hint"),
    countYes: document.getElementById("count-yes"),
    countMaybe: document.getElementById("count-maybe"),
    countNo: document.getElementById("count-no"),
    guestStatus: document.getElementById("guest-status"),
    guestEmpty: document.getElementById("guest-empty"),
    guestList: document.getElementById("guest-list"),
    photoForm: document.getElementById("photo-form"),
    photoNotice: document.getElementById("photo-notice"),
    photoHint: document.getElementById("photo-hint"),
    photoStatus: document.getElementById("photo-status"),
    photoEmpty: document.getElementById("photo-empty"),
    gallery: document.getElementById("gallery")
  };

  function keysArePlaceholder() {
    const url = String(party.supabaseUrl || "");
    const key = String(party.supabaseAnonKey || "");
    if (!url || !key) return true;
    return url.includes("YOUR_PROJECT") || key.includes("YOUR_ANON_KEY");
  }

  function mapsIsPlaceholder() {
    const url = String(party.mapsUrl || "");
    return !url || url.includes("?q=...");
  }

  function setNotice(el, text, kind) {
    if (!el) return;
    el.textContent = text || "";
    el.classList.remove("error", "ok");
    if (text && kind) el.classList.add(kind);
  }

  function errorText(err, fallback) {
    const message = err && err.message ? String(err.message) : "";
    return message ? fallback + " " + message : fallback;
  }

  function createPartyClient() {
    if (keysArePlaceholder()) return null;
    try {
      const lib = window.supabase;
      if (!lib || typeof lib.createClient !== "function") return null;
      const { createClient } = lib;
      return createClient(party.supabaseUrl, party.supabaseAnonKey);
    } catch (err) {
      return null;
    }
  }

  function renderInvite() {
    const title = party.title || "Birthday";
    document.title = title;
    els.title.textContent = title;

    if (mapsIsPlaceholder()) {
      els.maps.hidden = true;
      els.maps.removeAttribute("href");
    } else {
      els.maps.hidden = false;
      els.maps.href = party.mapsUrl;
      els.maps.target = "_blank";
      els.maps.rel = "noopener noreferrer";
    }
  }

  function statusLabel(status, count) {
    const people = count === 1 ? "1 person" : count + " people";
    if (status === "yes") return "Yes · " + people;
    if (status === "maybe") return "Maybe · " + people;
    if (status === "no") return "No";
    return status || "";
  }

  function renderGuestList(rows) {
    let yes = 0;
    let maybe = 0;
    let no = 0;
    const items = [];

    rows.forEach(function (row) {
      const status = row.status;
      const count = Number(row.guest_count) || 0;
      if (status === "yes") yes += count;
      else if (status === "maybe") maybe += 1;
      else if (status === "no") no += 1;

      const li = document.createElement("li");
      const name = document.createElement("span");
      name.className = "guest-name";
      name.textContent = row.name || "";
      const meta = document.createElement("span");
      meta.className = "guest-meta";
      meta.textContent = statusLabel(status, count);
      li.append(name, meta);

      if (row.message) {
        const note = document.createElement("p");
        note.className = "guest-note";
        note.textContent = row.message;
        li.append(note);
      }
      items.push(li);
    });

    els.countYes.textContent = String(yes);
    els.countMaybe.textContent = String(maybe);
    els.countNo.textContent = String(no);
    els.guestEmpty.hidden = items.length > 0;
    els.guestList.replaceChildren.apply(els.guestList, items);
  }

  async function loadRsvps(client) {
    try {
      const { data, error } = await client
        .from("rsvps")
        .select("name,status,guest_count,message,created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      els.guestStatus.textContent = "";
      renderGuestList(data || []);
    } catch (err) {
      els.guestStatus.textContent = errorText(err, "Couldn't load the guest list.");
    }
  }

  function renderGallery(rows, client) {
    const figures = [];
    rows.forEach(function (row) {
      const figure = document.createElement("figure");
      const img = document.createElement("img");
      const path = row.storage_path || "";
      const pub = client.storage.from("party-photos").getPublicUrl(path);
      img.src = pub && pub.data && pub.data.publicUrl ? pub.data.publicUrl : "";
      img.alt = row.name ? "Photo from " + row.name : "Party photo";

      const caption = document.createElement("figcaption");
      const name = document.createElement("span");
      name.className = "photo-name";
      name.textContent = row.name || "";
      caption.append(name);
      if (row.caption) {
        const cap = document.createElement("span");
        cap.className = "photo-caption";
        cap.textContent = row.caption;
        caption.append(cap);
      }
      figure.append(img, caption);
      figures.push(figure);
    });
    els.photoEmpty.hidden = figures.length > 0;
    els.gallery.replaceChildren.apply(els.gallery, figures);
  }

  async function loadPhotos(client) {
    try {
      const { data, error } = await client
        .from("photos")
        .select("name,caption,storage_path,created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      els.photoStatus.textContent = "";
      renderGallery(data || [], client);
    } catch (err) {
      els.photoStatus.textContent = errorText(err, "Couldn't load photos.");
    }
  }

  function readLimitedText(value, max, label) {
    const text = String(value || "").trim();
    if (text.length > max) {
      return { error: label + " needs to be " + max + " characters or less." };
    }
    return { text: text };
  }

  function resizeToJpeg(file) {
    return new Promise(function (resolve, reject) {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = function () {
        URL.revokeObjectURL(url);
        const largest = Math.max(image.naturalWidth, image.naturalHeight) || 1;
        const scale = Math.min(1, MAX_EDGE / largest);
        const width = Math.max(1, Math.round(image.naturalWidth * scale));
        const height = Math.max(1, Math.round(image.naturalHeight * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not resize that photo."));
          return;
        }
        ctx.drawImage(image, 0, 0, width, height);
        canvas.toBlob(function (blob) {
          if (!blob) reject(new Error("Could not encode that photo."));
          else resolve(blob);
        }, "image/jpeg", JPEG_QUALITY);
      };
      image.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error("Could not read that image."));
      };
      image.src = url;
    });
  }

  async function onRsvpSubmit(event) {
    event.preventDefault();
    const button = els.rsvpForm.querySelector("button[type=submit]");
    const original = button.textContent;
    try {
      if (keysArePlaceholder()) {
        setNotice(els.rsvpNotice, "RSVPs aren't connected yet. Fill in supabaseUrl and supabaseAnonKey in party.config.js, then try again.", "error");
        return;
      }

      const data = new FormData(els.rsvpForm);
      const name = readLimitedText(data.get("name"), 80, "Name");
      if (name.error) {
        setNotice(els.rsvpNotice, name.error, "error");
        return;
      }
      if (!name.text) {
        setNotice(els.rsvpNotice, "Add your name.", "error");
        return;
      }

      const status = String(data.get("status") || "");
      if (status !== "yes" && status !== "no" && status !== "maybe") {
        setNotice(els.rsvpNotice, "Pick yes, no, or maybe.", "error");
        return;
      }

      const guestCount = Number(data.get("guest_count"));
      if (!Number.isInteger(guestCount) || guestCount < 1 || guestCount > 10) {
        setNotice(els.rsvpNotice, "How many people needs to be a whole number from 1 to 10.", "error");
        return;
      }

      const message = readLimitedText(data.get("message"), 500, "Note");
      if (message.error) {
        setNotice(els.rsvpNotice, message.error, "error");
        return;
      }

      const client = createPartyClient();
      if (!client) {
        setNotice(els.rsvpNotice, "The Supabase library didn't load. Refresh and try again.", "error");
        return;
      }

      button.disabled = true;
      button.textContent = "Sending…";
      const { error } = await client.from("rsvps").insert({
        name: name.text,
        status: status,
        guest_count: guestCount,
        message: message.text || null
      });
      if (error) throw error;

      els.rsvpForm.reset();
      setNotice(els.rsvpNotice, "Thanks — your RSVP is in.", "ok");
      await loadRsvps(client);
    } catch (err) {
      setNotice(els.rsvpNotice, errorText(err, "Couldn't save that RSVP."), "error");
    } finally {
      button.disabled = false;
      button.textContent = original;
    }
  }

  async function onPhotoSubmit(event) {
    event.preventDefault();
    const button = els.photoForm.querySelector("button[type=submit]");
    const original = button.textContent;
    try {
      if (keysArePlaceholder()) {
        setNotice(els.photoNotice, "Photo uploads aren't connected yet. Fill in supabaseUrl and supabaseAnonKey in party.config.js, then try again.", "error");
        return;
      }

      const data = new FormData(els.photoForm);
      const name = readLimitedText(data.get("name"), 80, "Name");
      if (name.error) {
        setNotice(els.photoNotice, name.error, "error");
        return;
      }
      if (!name.text) {
        setNotice(els.photoNotice, "Add your name.", "error");
        return;
      }

      const caption = readLimitedText(data.get("caption"), 200, "Caption");
      if (caption.error) {
        setNotice(els.photoNotice, caption.error, "error");
        return;
      }

      const fileInput = els.photoForm.elements.photo;
      const file = fileInput && fileInput.files && fileInput.files[0];
      if (!file) {
        setNotice(els.photoNotice, "Choose a photo.", "error");
        return;
      }
      if (file.type && file.type.indexOf("image/") !== 0) {
        setNotice(els.photoNotice, "That file isn't an image.", "error");
        return;
      }

      const client = createPartyClient();
      if (!client) {
        setNotice(els.photoNotice, "The Supabase library didn't load. Refresh and try again.", "error");
        return;
      }

      button.disabled = true;
      button.textContent = "Uploading…";
      const blob = await resizeToJpeg(file);
      if (blob.size > MAX_UPLOAD_BYTES) {
        setNotice(els.photoNotice, "That photo is still too large after resizing. Try a different one.", "error");
        return;
      }

      const path = crypto.randomUUID() + ".jpg";
      const uploaded = await client.storage.from("party-photos").upload(path, blob, {
        contentType: "image/jpeg",
        cacheControl: "3600",
        upsert: false
      });
      if (uploaded.error) throw uploaded.error;

      const inserted = await client.from("photos").insert({
        name: name.text,
        caption: caption.text || null,
        storage_path: path
      });
      if (inserted.error) throw inserted.error;

      els.photoForm.reset();
      setNotice(els.photoNotice, "Photo added.", "ok");
      await loadPhotos(client);
    } catch (err) {
      setNotice(els.photoNotice, errorText(err, "Couldn't add that photo."), "error");
    } finally {
      button.disabled = false;
      button.textContent = original;
    }
  }

  renderInvite();

  const placeholderNote = "Add your Supabase URL and anon key in party.config.js to turn this on.";
  if (keysArePlaceholder()) {
    els.rsvpHint.hidden = false;
    els.rsvpHint.textContent = placeholderNote;
    els.photoHint.hidden = false;
    els.photoHint.textContent = placeholderNote;
  }

  els.rsvpForm.addEventListener("submit", function (event) {
    onRsvpSubmit(event);
  });
  els.photoForm.addEventListener("submit", function (event) {
    onPhotoSubmit(event);
  });

  const client = createPartyClient();
  if (client) {
    els.guestStatus.textContent = "Loading guest list…";
    els.photoStatus.textContent = "Loading photos…";
    loadRsvps(client);
    loadPhotos(client);
  }
})();
