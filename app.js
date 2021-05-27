const express = require('express');

const app = express();
const port = 5000;

app.use(express.static("css"));
app.use(express.static("data"));
app.use(express.static("public"));

app.set("view engine", "ejs");

app.get('/', function (req, res)
{
    res.render("index");
})

// app.listen(process.env.PORT, process.env.IP);
app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`))