
var OBJDoc = function (fileName) {
  this.fileName = fileName;
  this.mtls = new Array(0);
  this.objects = new Array(0);
  this.vertices = new Array(0);
  this.normals = new Array(0);
}
OBJDoc.prototype.parse = function (fileString, scale, reverse) {
  var lines = fileString.split('\n');
  lines.push(null);
  var index = 0;

  var currentObject = new OBJObject("");
  this.objects.push(currentObject);
  var currentMaterialName = "";
  var line;
  var sp = new StringParser();
  while ((line = lines[index++]) != null) {
    sp.init(line);
    var command = sp.getWord();
    if (command == null) continue;

    switch (command) {
      case '#':
        continue;
      case 'mtllib':
        var path = this.parseMtllib(sp, this.fileName);
        var mtl = new MTLDoc();
        this.mtls.push(mtl);
        var request = new XMLHttpRequest();
        request.onreadystatechange = function () {
          if (request.readyState == 4) {
            if (request.status != 404) {
              onReadMTLFile(request.responseText, mtl);
            } else {
              mtl.complete = true;
            }
          }
        }
        request.open('GET', path, true);
        request.send();
        continue;
      case 'o':
      case 'g':
        if (currentObject.numIndices == 0) {
          currentObject = this.parseObjectName(sp);
          this.objects[0] = currentObject;
        }
        else {
          var object = this.parseObjectName(sp);
          this.objects.push(object);
          currentObject = object;
        }
        continue;
      case 'v':
        var vertex = this.parseVertex(sp, scale);
        this.vertices.push(vertex);
        continue;
      case 'vn':
        var normal = this.parseNormal(sp);
        this.normals.push(normal);
        continue;
      case 'usemtl':
        currentMaterialName = this.parseUsemtl(sp);
        continue;
      case 'f':
        var face = this.parseFace(sp, currentMaterialName, this.vertices, reverse);
        currentObject.addFace(face);
        continue;
    }
  }

  return true;
}

OBJDoc.prototype.parseMtllib = function (sp, fileName) {
  var i = fileName.lastIndexOf("/");
  var dirPath = "";
  if (i > 0) dirPath = fileName.substr(0, i + 1);

  return dirPath + sp.getWord();
}

OBJDoc.prototype.parseObjectName = function (sp) {
  var name = sp.getWord();
  return (new OBJObject(name));
}

OBJDoc.prototype.parseVertex = function (sp, scale) {
  var x = sp.getFloat() * scale;
  var y = sp.getFloat() * scale;
  var z = sp.getFloat() * scale;
  return (new Vertex(x, y, z));
}

OBJDoc.prototype.parseNormal = function (sp) {
  var x = sp.getFloat();
  var y = sp.getFloat();
  var z = sp.getFloat();
  return (new Normal(x, y, z));
}

OBJDoc.prototype.parseUsemtl = function (sp) {
  return sp.getWord();
}

OBJDoc.prototype.parseFace = function (sp, materialName, vertices, reverse) {
  var face = new Face(materialName);
  for (; ;) {
    var word = sp.getWord();
    if (word == null) break;
    var subWords = word.split('/');
    if (subWords.length >= 1) {
      var vi = parseInt(subWords[0]) - 1;
      if (!isNaN(vi))
        face.vIndices.push(vi);
    }
    if (subWords.length >= 3) {
      var ni = parseInt(subWords[2]) - 1;
      face.nIndices.push(ni);
    } else {
      face.nIndices.push(-1);
    }
  }
  var v0 = [
    vertices[face.vIndices[0]].x,
    vertices[face.vIndices[0]].y,
    vertices[face.vIndices[0]].z];
  var v1 = [
    vertices[face.vIndices[1]].x,
    vertices[face.vIndices[1]].y,
    vertices[face.vIndices[1]].z];
  var v2 = [
    vertices[face.vIndices[2]].x,
    vertices[face.vIndices[2]].y,
    vertices[face.vIndices[2]].z];
  var normal = calcNormal(v0, v1, v2);
  if (normal == null) {
    if (face.vIndices.length >= 4) {
      var v3 = [
        vertices[face.vIndices[3]].x,
        vertices[face.vIndices[3]].y,
        vertices[face.vIndices[3]].z];
      normal = calcNormal(v1, v2, v3);
    }
    if (normal == null) {
      normal = [0.0, 1.0, 0.0];
    }
  }
  if (reverse) {
    normal[0] = -normal[0];
    normal[1] = -normal[1];
    normal[2] = -normal[2];
  }
  face.normal = new Normal(normal[0], normal[1], normal[2]);
  if (face.vIndices.length > 3) {
    var n = face.vIndices.length - 2;
    var newVIndices = new Array(n * 3);
    var newNIndices = new Array(n * 3);
    for (var i = 0; i < n; i++) {
      newVIndices[i * 3 + 0] = face.vIndices[0];
      newVIndices[i * 3 + 1] = face.vIndices[i + 1];
      newVIndices[i * 3 + 2] = face.vIndices[i + 2];
      newNIndices[i * 3 + 0] = face.nIndices[0];
      newNIndices[i * 3 + 1] = face.nIndices[i + 1];
      newNIndices[i * 3 + 2] = face.nIndices[i + 2];
    }
    face.vIndices = newVIndices;
    face.nIndices = newNIndices;
  }
  face.numIndices = face.vIndices.length;

  return face;
}
function onReadMTLFile(fileString, mtl) {
  var lines = fileString.split('\n');
  lines.push(null);
  var index = 0;
  var line;
  var name = "";
  var sp = new StringParser();
  while ((line = lines[index++]) != null) {
    sp.init(line);
    var command = sp.getWord();
    if (command == null) continue;

    switch (command) {
      case '#':
        continue;
      case 'newmtl':
        name = mtl.parseNewmtl(sp);
        continue;
      case 'Kd':
        if (name == "") continue;
        var material = mtl.parseRGB(sp, name);
        mtl.materials.push(material);
        name = "";
        continue;
    }
  }
  mtl.complete = true;
}
OBJDoc.prototype.isMTLComplete = function () {
  if (this.mtls.length == 0) return true;
  for (var i = 0; i < this.mtls.length; i++) {
    if (!this.mtls[i].complete) return false;
  }
  return true;
}
OBJDoc.prototype.findColor = function (name) {
  for (var i = 0; i < this.mtls.length; i++) {
    for (var j = 0; j < this.mtls[i].materials.length; j++) {
      if (this.mtls[i].materials[j].name == name) {
        return (this.mtls[i].materials[j].color)
      }
    }
  }
  return (new Color(0.8, 0.8, 0.8, 1));
}
OBJDoc.prototype.getDrawingInfo = function () {
  var numVertices = 0;
  var numIndices = 0;
  for (var i = 0; i < this.objects.length; i++) {
    numIndices += this.objects[i].numIndices;
  }
  var numVertices = this.vertices.length;
  var vertices = new Float32Array(numVertices * 3);
  var normals = new Float32Array(numVertices * 3);
  var colors = new Float32Array(numVertices * 4);
  var indices = new Uint16Array(numIndices);
  var index_indices = 0;
  for (var i = 0; i < this.objects.length; i++) {
    var object = this.objects[i];
    for (var j = 0; j < object.faces.length; j++) {
      var face = object.faces[j];
      var color = this.findColor(face.materialName);
      var faceNormal = face.normal;
      for (var k = 0; k < face.vIndices.length; k++) {
        var vIdx = face.vIndices[k];
        indices[index_indices] = vIdx;
        var vertex = this.vertices[vIdx];
        vertices[vIdx * 3 + 0] = vertex.x;
        vertices[vIdx * 3 + 1] = vertex.y;
        vertices[vIdx * 3 + 2] = vertex.z;
        colors[vIdx * 4 + 0] = color.r;
        colors[vIdx * 4 + 1] = color.g;
        colors[vIdx * 4 + 2] = color.b;
        colors[vIdx * 4 + 3] = color.a;
        var nIdx = face.nIndices[k];
        if (nIdx >= 0) {
          var normal = this.normals[nIdx];
          normals[vIdx * 3 + 0] = normal.x;
          normals[vIdx * 3 + 1] = normal.y;
          normals[vIdx * 3 + 2] = normal.z;
        } else {
          normals[vIdx * 3 + 0] = faceNormal.x;
          normals[vIdx * 3 + 1] = faceNormal.y;
          normals[vIdx * 3 + 2] = faceNormal.z;
        }
        index_indices++;
      }
    }
  }

  return new DrawingInfo(vertices, normals, colors, indices);
}
var MTLDoc = function () {
  this.complete = false;
  this.materials = new Array(0);
}

MTLDoc.prototype.parseNewmtl = function (sp) {
  return sp.getWord();
}

MTLDoc.prototype.parseRGB = function (sp, name) {
  var r = sp.getFloat();
  var g = sp.getFloat();
  var b = sp.getFloat();
  return (new Material(name, r, g, b, 1));
}
var Material = function (name, r, g, b, a) {
  this.name = name;
  this.color = new Color(r, g, b, a);
}
var Vertex = function (x, y, z) {
  this.x = x;
  this.y = y;
  this.z = z;
}
var Normal = function (x, y, z) {
  this.x = x;
  this.y = y;
  this.z = z;
}
var Color = function (r, g, b, a) {
  this.r = r;
  this.g = g;
  this.b = b;
  this.a = a;
}
var OBJObject = function (name) {
  this.name = name;
  this.faces = new Array(0);
  this.numIndices = 0;
}

OBJObject.prototype.addFace = function (face) {
  this.faces.push(face);
  this.numIndices += face.numIndices;
}
var Face = function (materialName) {
  this.materialName = materialName;
  if (materialName == null) this.materialName = "";
  this.vIndices = new Array(0);
  this.nIndices = new Array(0);
}
var DrawingInfo = function (vertices, normals, colors, indices) {
  this.vertices = vertices;
  this.normals = normals;
  this.colors = colors;
  this.indices = indices;
}
var StringParser = function (str) {
  this.str;
  this.index;
  this.init(str);
}
StringParser.prototype.init = function (str) {
  this.str = str;
  this.index = 0;
}
StringParser.prototype.skipDelimiters = function () {
  for (var i = this.index, len = this.str.length; i < len; i++) {
    var c = this.str.charAt(i);
    if (c == '\t' || c == ' ' || c == '(' || c == ')' || c == '"') continue;
    break;
  }
  this.index = i;
}
StringParser.prototype.skipToNextWord = function () {
  this.skipDelimiters();
  var n = getWordLength(this.str, this.index);
  this.index += (n + 1);
}
StringParser.prototype.getWord = function () {
  this.skipDelimiters();
  var n = getWordLength(this.str, this.index);
  if (n == 0) return null;
  var word = this.str.substr(this.index, n);
  this.index += (n + 1);

  return word;
}
StringParser.prototype.getInt = function () {
  return parseInt(this.getWord());
}
StringParser.prototype.getFloat = function () {
  return parseFloat(this.getWord());
}
function getWordLength(str, start) {
  var n = 0;
  for (var i = start, len = str.length; i < len; i++) {
    var c = str.charAt(i);
    if (c == '\t' || c == ' ' || c == '(' || c == ')' || c == '"')
      break;
  }
  return i - start;
}
function calcNormal(p0, p1, p2) {
  var v0 = new Float32Array(3);
  var v1 = new Float32Array(3);
  for (var i = 0; i < 3; i++) {
    v0[i] = p0[i] - p1[i];
    v1[i] = p2[i] - p1[i];
  }
  var c = new Float32Array(3);
  c[0] = v0[1] * v1[2] - v0[2] * v1[1];
  c[1] = v0[2] * v1[0] - v0[0] * v1[2];
  c[2] = v0[0] * v1[1] - v0[1] * v1[0];

  var x = c[0], y = c[1], z = c[2], g = Math.sqrt(x * x + y * y + z * z);
  if (g) {
    if (g == 1)
      return c;
  } else {
    c[0] = 0; c[1] = 0; c[2] = 0;
    return c;
  }
  g = 1 / g;
  c[0] = x * g; c[1] = y * g; c[2] = z * g;
  return c;
}
