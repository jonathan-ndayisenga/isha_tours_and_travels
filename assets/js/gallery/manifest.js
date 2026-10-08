export async function loadActivitiesManifest({ url = "assets/data/activities-gallery.json" } = {}) {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`Failed to load manifest (${response.status}): ${url}`);
  }
  return response.json();
}

