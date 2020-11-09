module.exports = {
    sources: "./src",
    outDir: "./_compiled/css",
    purgeCSS: {
        content: ["./public/*.html", "./public/js/*.js"],
    },
};