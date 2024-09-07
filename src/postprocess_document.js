function replace_links() {
  const all_links = document.querySelectorAll("a");

  for (const link of all_links) {
    const href = new URL(link.href);
    const text = link.innerHTML;

    if (href.hostname != window.location.hostname) {
      link.setAttribute("target", "_blank");
    }

    link.innerHTML = `
      <span>${text}</span>
      <svg xmlns="http://www.w3.org/2000/svg"
            width="1em"
            height="1em"
            viewBox="0 0 32 32">
          <path fill="currentColor" d="M5 5v22h22V5zm2 2h18v18H7zm6 3v2h5.563L9.28 21.281l1.438 1.438L20 13.437V19h2v-9z" />
      </svg>
    `;
  }
}

function fix_relative_path(href) {
  let new_url = href;
  let prod_hostname = "/monospace";

  if (!window.location.hostname.includes("github")) {
    prod_hostname = "";
  }

  const map_folders = {
    "/assets/": `${prod_hostname}/assets/`,
  };

  for (const path of Object.keys(map_folders)) {
    new_url = new_url.replaceAll(path, map_folders[path]);
  }
  console.log(`${href} -> ${new_url}`);
  return new_url;
}

function fix_image_paths() {
  const all_images = document.querySelectorAll("img");

  for (const image of all_images) {
    image.src = fix_relative_path(image.src, "img");
  }
}

(() => {
  replace_links();
  fix_image_paths();
})();
