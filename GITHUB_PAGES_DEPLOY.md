# GitHub Pages preview deployment

1. Create a new GitHub repository named `pharaoh-talent` (do not initialize with a README).
2. Extract this ZIP and open PowerShell in the extracted project folder.
3. Run the commands in README / user instructions.
4. In GitHub, open Settings → Pages → Build and deployment → Deploy from a branch.
5. Select branch `main`, folder `/docs`, and Save.
6. Wait for the Pages deployment workflow to finish. The URL will be `https://YOUR-GITHUB-USERNAME.github.io/pharaoh-talent/`.

Important: this is a static preview, not the full platform. The Node.js backend, PostgreSQL, login, guardian consent, and video uploads need a separate backend host. For the full platform use the Render Blueprint (`render.yaml`) and configure the production environment. Do not commit `.env` files or secrets.
