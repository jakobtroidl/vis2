const express = require('express');

const app = express();

app.use(express.static("css"));
app.use(express.static("data"));
app.use(express.static("public"));

app.set("view engine", "ejs");

app.get('/', function (req, res)
{
    res.render("index");
})

const port = process.env.PORT || 5000;
app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
});
