const { spawn } = require("child_process");

const query = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

console.log(`Fetching stream URL for: ${query}`);

const ytdlp = spawn("yt-dlp", ["-f", "bestaudio", "-g", query]);

ytdlp.stdout.on("data", (data) => {
    const streamUrl = data.toString().trim();
    if (!streamUrl) return;

    console.log(`Stream URL found: ${streamUrl}`);
    console.log("Spawning MPV without input-file=- ...");

    const player = spawn("mpv", [
        "--no-video",
        "-v",
        streamUrl,
    ], {
        stdio: ["pipe", "pipe", "pipe"],
    });

    player.stdout.on("data", (d) => console.log(`MPV STDOUT: ${d}`));
    player.stderr.on("data", (d) => console.error(`MPV STDERR: ${d}`));

    player.on("close", (code) => {
        console.log(`Player ended with code ${code}`);
    });
});
