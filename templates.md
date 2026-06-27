# Template Code Injects
These are injected into new code for better user experience and accessibility. Make sure to add these before you release a new game.
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
## Favicon Code (Paste just below `<head>`)
This makes our logo show up in tabs on browsers. It's required on every page.
```
<link rel="icon" type="image/x-icon" href="/images/favicon.png">
```
