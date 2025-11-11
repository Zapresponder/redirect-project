module.exports = {
  apps: [
    {
      name: "redirect",
      script: "index.js",
      watch: ".",
    },
  ],
  deploy: {
    production: {
      user: "root",
      host: "72.60.13.5",
      ref: "origin/main",
      repo: "https://github.com/Zapresponder/redirect-project.git",
      path: "/root/apps/redirect-project",
      "pre-deploy-local": "",
      "post-deploy":
        "npm install && pm2 reload ecosystem.config.js --env production",
      "pre-setup": "",
    },
  },
}
