# Template Code Injects
These are injected into new code for better user experience and accessibility. Make sure to add these before you release a new game.

## Table of Contents
[Back to Homepage and Instructions buttons](#instructions-and-back-to-homepage-buttons)

[Instructions Page](#instructions-page-code)

[Game Card Code](#game-card-code)

[Favicon Code](#favicon-code)

[Preview Command](#preview-command)

## Tips & Tricks
- Make sure to test your code before commiting, you can do that using [ScriptView](https://ftgames.xyz/scriptview). Our dedicated HTML test viewer.
- Package Scratch projects using the [TurboWarp Packager](https://packager.turbowarp.org/), if the project is too big to import via GitHub, boot up a [Codespace](https://github.com/codespaces/new?hide_repo_select=true&repo=1256556385&skip_quickstart=true&ref=main) and upload it through Source Control.
- Use Visual Studio Code when possible as it can automatically fill in code for you, making production move much faster
- When you use AI to code, always double-check to make sure it has no bugs and follows our release guidelines.
- Code quality is **super important** when you commit to FT Games, not only does it need to be easily readable so other developers can edit it and understand it, but it also needs to work properly so that users get a smooth experience.
- These code injects are only templates, make sure to double-check this code and replace any placeholders with your game directory.

## Instructions and Back to Homepage Buttons
These are injected into new game imports for accessibility and user experience. These scripts need to be injected into any new game added to FT Games.
### Styling (Paste just before `</style>`)
```
#homeButton,
#instructionsButton{
    position:fixed;
    top:10px;
    z-index:9999999;

    display:inline-flex;
    align-items:center;
    justify-content:center;

    padding:10px 18px;

    background:rgba(20,20,30,.92);
    border:2px solid #00e5ff;
    border-radius:14px;

    color:#fff !important;
    font:700 15px Arial,sans-serif !important;
    text-decoration:none !important;
    line-height:1;
    cursor:pointer;

    box-shadow:
        0 0 10px rgba(0,229,255,.35),
        inset 0 0 8px rgba(0,229,255,.15);

    transition:.25s ease;
    user-select:none;
}

#homeButton{
    right:10px;
}

#instructionsButton{
    left:10px;
}

#homeButton:hover,
#instructionsButton:hover{
    background:linear-gradient(90deg,#00e5ff,#00ff99);
    color:#000 !important;
    box-shadow:0 0 18px rgba(0,255,170,.45);
    transform:translateY(-2px);
}
```
### Object Code (Paste just after `<body>`)
```
<a id="homeButton" href="https://ftgames.xyz/games">
🏠 Home
</a>

<div id="instructionsButton">
📖 Instructions
</div>
```
### Instructions Popup Window (Paste whole script block just before `</body>` and just after `</script>`)
```
<script>
  document.getElementById("instructionsButton").addEventListener("click", () => {
      window.open(
          "https://ftgames.xyz[/REPLACE_WITH_GAME_DIRECTORY]/instructions",
          "instructions",
          "width=800,height=600,resizable=yes,scrollbars=yes"
      );
  });
</script>
```
## Instructions Page Code
This is a template for an instructions page. You need this for every game.
```
<div style="position:relative;font-family:'Segoe UI',Arial,sans-serif;background:#000000;color:#ffffff;text-align:center;line-height:1.8;max-width:900px;margin:auto;padding:30px;border-radius:20px;">

    <!-- FTGames Logo -->
    <img src="../images/favicon.png"
         alt="FTGames Logo"
         style="
            position:absolute;
            top:15px;
            left:15px;
            width:60px;
            height:auto;
            opacity:.95;
            user-select:none;
         ">

    <span style="font-size:46px;font-weight:900;background:linear-gradient(90deg,#00e5ff,#00ff99,#00e5ff);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">
        😊 GAME 😊
    </span>

    <br><br>

    <div style="display:inline-block;background:#111111;border:2px solid #00e5ff;border-radius:18px;padding:20px 40px;box-shadow:0 0 25px rgba(0,229,255,.35);">

        <span style="font-size:28px;font-weight:800;color:#00e5ff;">
            🎮 CONTROLS
        </span>

        <br><br>

        😊 <b>Control 1</b> — Does this<br>
        😊 <b>Control 2</b> — Does that<br>
        😊 <b>Control 3</b> — Does something sus

    </div>

    <br><br><br>

    <span style="font-size:28px;font-weight:800;color:#7cffcb;">
        ⚡ HOW TO PLAY
    </span>

    <br><br>

    😊 Do this<br>
    😊 Do that<br>
    😊 Don't forget to do this too<br>
    😊 You don't wanna do this<br>
    😊 Btw do this too

    <br><br><br>

    <span style="font-size:28px;font-weight:800;color:#ffda44;">
        ⭐ TIPS
    </span>

    <br><br>

    😊 TIP 1<br>
    😊 TIP 2<br>
    😊 TIP 3<br>
    😊 TIP 4

    <br><br><br>

    <div style="display:inline-block;padding:18px 35px;border-radius:999px;background:linear-gradient(90deg,#00e5ff,#00ff99);color:#000000;font-size:22px;font-weight:900;box-shadow:0 0 35px rgba(0,255,170,.45);">
        OBJECTIVE 1 • OBJECTIVE 2 • OBJECTIVE 3
    </div>

</div>
```
## Game Card Code
### Game Card Code (Paste just before the Suggestion Box game card.)
This is the code used in games.html, it redirects to your game's page. Make sure to replace all of the placeholders with your actual game resources directory.
```
      <a class="game-card" href="/my_game">
        <img class="game-card-thumbnail" src="thumbnails/my-game-thumbnail.png" alt="My Game thumbnail">
        <div class="game-card-content">
          <h2 class="game-card-title">My Game</h2>
          <p class="game-card-description">My description</p>
          <div class="game-card-tags">
            <span class="game-tag game-tag-genre">Genre: TBD</span>
            <span class="game-tag game-tag-difficulty">Difficulty: TBD</span>
          </div>
        </div>
      </a>
```
## Favicon Code
This makes our logo show up in tabs on browsers. It's required on every page.
### Favicon Code (Paste somewhere inside `<head>`)
```
<link rel="icon" type="image/x-icon" href="/images/favicon.png">
```
## Preview Command
This command, when executed in the terminal, will allow you to preview the website from a browser Codespace instance. It's useful as it allows easy previews of code without download clutter.
### Preview Command (Paste inside terminal)
```bash .dev/preview.sh```
then enter
```8080```
or another port number if neccessary.
Once you have completed these steps, a notification should appear in your codespace with a button that says "Open in Browser", click on that button and it will connect to the port. Once you're done, use Ctrl+C or kill the terminal with the 🗑️ icon.