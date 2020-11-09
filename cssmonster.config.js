module.exports = {
    sources: "./src",
    outDir: "./public/css",
    purgeCSS: {
        content: ["./public/*.html", "./public/js/*.js"],
    },
};