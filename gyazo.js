var
  http = require("http"),
  formidable = require("formidable"),
  fs = require("fs"),
  mv = require("mv"),
  crypto = require("crypto"),
  path = require("path"),
  jsonconfig = require("jsonconfig");


jsonconfig.load(["./gyazo.conf"], function(err){
  if (err) throw err;
});
var HOST = jsonconfig["host"];
var PORT = jsonconfig["port"];
var PATH = jsonconfig["path"];
var URL = "http://" + HOST + ":" + PORT + "/";

function connectFile(path, res) {
  var input = fs.createReadStream(path);
  input.pipe(res);
}
function distributeFile(file, type, res) {
  path.exists(file, function(exists){
    if (exists) {
      res.writeHead(200, {"Content-Type": type});
      connectFile(file, res);
    } else {
      res.writeHead(404, {"Content-Type": "text/plain"});
      res.end("Not Found");
    }
  });
}

server = http.createServer(function(req, res){
  var url = req.url;

  if (url == PATH) {
    // upload
    var form = new formidable.IncomingForm();
    form.encoding = "binary";
    var md5sum = crypto.createHash("md5");
    var imagedata;
    form.on("file", function(name, file){
      if (name == "imagedata") {
        fs.readFile(file.path, function(err, data){
          if (err) console.log(err);
          imagedata = data;
          md5sum.update(imagedata, "binary");
          var hash = md5sum.digest("hex");
          var dst_name = hash + ".png";
          var dst_path = "./image/" + dst_name;
          mv(file.path, dst_path, function(err){
            if (err) {
              res.writeHead(500, {"Content-Type": "text/plain"})
              res.end("cannot write uploaded data");
            } else {
              res.writeHead(200, {"Content-Type": "text/plain"});
              res.end(URL + dst_name);
              console.log("uploaded " + URL + dst_name);
            }
          });
        });
      }
    });
    form.parse(req);
  } else if (url.indexOf(".png") == 33) {
    // publish image
    var imagepath = "./image/" + path.basename(url);
    distributeFile(imagepath, "image/png", res);
  } else if (url == "/") {
    // publish download page
    res.writeHead(200, {"Content-Type": "text/html"});
    connectFile("./public/index.html", res);
  } else {
    // publish client
    var filepath = "./public/" + path.basename(url);
    distributeFile(filepath, "application/octet-stream", res);
  }
});

server.listen(PORT);
console.log("Server running at " + URL);
