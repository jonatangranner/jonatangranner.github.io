(function () {
  'use strict';

  function Draw() {
    var self = this;

    // Get context
    var canvas = document.querySelector('canvas');
    this._gl = canvas.getContext("webgl", { alpha: true }) || canvas.getContext("experimental-webgl", { alpha: true });

    // Enable depth test, this allows one to remove hidden surfaces
    this._gl.enable(this._gl.DEPTH_TEST);
    this._gl.enable(this._gl.POLYGON_OFFSET_FILL);
    this._gl.enable(this._gl.BLEND);

    // The color should be t*alpha + s*(1-alpha)
    this._gl.blendFunc(this._gl.SRC_ALPHA, this._gl.ONE_MINUS_SRC_ALPHA);

    // Set viewport and background color
    this._gl.viewport(0, 0, canvas.width, canvas.height);
    this._gl.clearColor(0.3921, 0.5843, 0.9294, 1.0);

    // Load sharders
    this._program = {
      texture: new Program(this._gl, 'texture'),
      figure: new Program(this._gl, 'figure'),
      shadow: new Program(this._gl, 'shadow')
    };

    // Intialize buffers
    this._geometries = {
      ground: new GeometryBuffer(this._gl, {
        position: "aPosition",
        texture: "aTexCoord"
      }, false),
      figure: new GeometryBuffer(this._gl, {
        normal: "aNormal",
        color: "aColor",
        position: "aPosition"
      }, true)
    };

    // Intialize texture
    this._texture = [
      new Texture(0, this._gl, this._program.texture.getUniformLocation("texMap"))
    ];

    // Model view
    var screenV = (function () {
      var eye = vec3(0.0, 0.0, 1);
      var at = vec3(0.0, 0.0, 0.0);
      var up = vec3(0.0, 1.0, 0.0);
      return lookAt(eye, at, up);
    })();

    var debugV = (function () {
      var eye = vec3(0.0, 2.0, -3.001);
      var at = vec3(0.0, 0.0, -3.0);
      var up = vec3(0.0, 1.0, 0.0);
      return lookAt(eye, at, up);
    })();

    var P = perspective(90, 1, 0.01, 30.0);

    this._screenV = screenV;
    this._shadowV = mat4();
    this._figureM = mat4();
    this._light = vec4();

    // Bind model uniforms
    this._program.texture.use();
    var groundM = translate(-0.0, -0.0, -0.0);
    this._gl.uniformMatrix4fv(this._program.texture.getUniformLocation("uM"), false, flatten(groundM));
    this._gl.uniformMatrix4fv(this._program.texture.getUniformLocation("uV"), false, flatten(this._screenV));
    this._gl.uniformMatrix4fv(this._program.texture.getUniformLocation("uP"), false, flatten(P));

    this._program.figure.use();
    this._uFigureM = this._program.figure.getUniformLocation("uM");
    this._uFigureLight = this._program.figure.getUniformLocation("lightDirection");
    this._gl.uniformMatrix4fv(this._program.figure.getUniformLocation("uV"), false, flatten(this._screenV));
    this._gl.uniformMatrix4fv(this._program.figure.getUniformLocation("uP"), false, flatten(P));

    this._program.shadow.use();
    this._uShadowM = this._program.shadow.getUniformLocation("uM");
    this._uShadowV = this._program.shadow.getUniformLocation("uV");
    this._gl.uniformMatrix4fv(this._program.shadow.getUniformLocation("uP"), false, flatten(P));

    // Setup objects
    this._addGround();

    // Setup light and material settings input
    this._listeners = [];
    var lightSettings = ['ka', 'kd', 'ks', 'alpha'];
    lightSettings.forEach(function (name) {
      var uniformRef = this._program.figure.getUniformLocation("u_" + name);
      this._addInput(name, function (value) {
        self._program.figure.use();
        self._gl.uniform1f(uniformRef, parseFloat(value));
      });
    }, this);

    // Load textures
    MtlObject.load('../teapot.obj', 0.25, true, function (err, figure) {
      if (err) throw err;

      self._geometries.figure.setFigure(figure);

      self._loadImage('../text.png', function (image) {
        self._texture[0].setImage(image);

        self.onready();
      });
    });
  }

  Draw.prototype._addInput = function (id, callback) {
    var elem = document.getElementById(id);
    var eventName = (elem.tagName === 'INPUT' ? 'input' : 'change');
    elem.addEventListener(eventName, function () {
      callback(elem.value);
    });
    callback(elem.value);

    this._listeners.push({ elem: elem, callback: callback });
  };

  Draw.prototype.updateInputs = function () {
    this._listeners.forEach(function (listener) {
      listener.callback(listener.elem.value);
    });
  };

  Draw.prototype._loadImage = function (src, callback) {
    var image = new Image();
    image.addEventListener('load', function() {
      callback(image);
    });
    image.src = src;
  };

  Draw.prototype._addGround = function () {
    var shapeA = vec3(-2, -1, -5);
    var shapeB = vec3(2, -1, -5);
    var shapeC = vec3(2, -1, -1);
    var shapeD = vec3(-2, -1, -1);

    var textureA = vec2(-2, -5);
    var textureB = vec2(2, -5);
    var textureC = vec2(2, -1);
    var textureD = vec2(-2, -1);

    var rect = new Rect(
      [shapeA, shapeB, shapeC, shapeD],
      [textureA, textureB, textureC, textureD]
    );

    this._geometries.ground.setFigure(rect);
  };

  Draw.prototype.setLightSource = function (light) {
    var yplane = -1;
    var m = mat4(); // Shadow projection matrix initially an identity matrix
          m[3][3] = 0.0;
          m[3][1] = -1.0/(light[1] - yplane);

    var t_forward = translate(light[0], light[1], light[2]);
    var t_backward = translate(-light[0], -light[1], -light[2]);

    this._light = vec4(-light[0], -light[1], -light[2], 0);
    this._shadowV = mult(this._screenV, mult(mult(t_forward, m), t_backward));
  };

  Draw.prototype.setFigureOffset = function (offset) {
    this._figureM = translate(-0.0, -1.0 + offset, -3.0);
  };

  Draw.prototype.render = function () {
    this._gl.clear(this._gl.COLOR_BUFFER_BIT | this._gl.DEPTH_BUFFER_BIT);

    // Draw ground
    this._program.texture.use();

    this._geometries.ground.bindAttributes(this._program.texture);
    this._texture[0].bindUniform();

    this._gl.drawArrays(this._gl.TRIANGLES, 0, this._geometries.ground.vetricesCount);

    // Draw shadow
    this._program.shadow.use();

    this._geometries.figure.bindAttributes(this._program.shadow);
    this._gl.uniformMatrix4fv(this._uShadowV, false, flatten(this._shadowV));
    this._gl.uniformMatrix4fv(this._uShadowM, false, flatten(this._figureM));

    this._gl.polygonOffset(1.0, 1.0); // Set polygon offset
    this._gl.depthFunc(this._gl.GREATER); // Set depth function
    this._gl.drawElements(this._gl.TRIANGLES, this._geometries.figure.vetricesCount, this._gl.UNSIGNED_SHORT, 0);
    this._gl.depthFunc(this._gl.LESS); // Reset depth function
    this._gl.polygonOffset(0.0, 0.0); // Reset polygon offset

    // Draw figure
    this._program.figure.use();

    this._geometries.figure.bindAttributes(this._program.figure);
    this._gl.uniform4fv(this._uFigureLight, flatten(this._light));
    this._gl.uniformMatrix4fv(this._uFigureM, false, flatten(this._figureM));

    this._gl.drawElements(this._gl.TRIANGLES, this._geometries.figure.vetricesCount, this._gl.UNSIGNED_SHORT, 0);
  };

  function Program(gl, programName) {
    this._gl = gl;
    this.program = initShaders(this._gl, programName + ".vertex.glsl", programName + ".fragment.glsl");
  }

  Program.prototype.getAttribLocation = function (attributeName) {
    return this._gl.getAttribLocation(this.program, attributeName);
  };

  Program.prototype.getUniformLocation = function (attributeName) {
    return this._gl.getUniformLocation(this.program, attributeName);
  };

  Program.prototype.use = function () {
    this._gl.useProgram(this.program);
  };

  function DataBuffer(gl, attribute, size) {
    this._gl = gl;
    this.size = size;
    this.attributeName = attribute;
    this.buffer = this._gl.createBuffer();
  }

  DataBuffer.prototype.bindAttribute = function(program) {
    var attribute = program.getAttribLocation(this.attributeName);
    if (attribute === -1) return;

    // Bind attributes
    this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this.buffer);
    this._gl.vertexAttribPointer(attribute, this.size, this._gl.FLOAT, false, 0, 0);
    this._gl.enableVertexAttribArray(attribute);
  };

  DataBuffer.prototype.setBuffer = function (data) {
    this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this.buffer);
    this._gl.bufferData(this._gl.ARRAY_BUFFER, flatten(data), this._gl.STATIC_DRAW);
  };

  function IndicesBuffer(gl) {
    this._gl = gl;

    this.buffer = this._gl.createBuffer();
  }

  IndicesBuffer.prototype.setBuffer = function (data) {
    this._gl.bindBuffer(this._gl.ELEMENT_ARRAY_BUFFER, this.buffer);
    this._gl.bufferData(this._gl.ELEMENT_ARRAY_BUFFER, data, this._gl.STATIC_DRAW);
  };

  function GeometryBuffer(gl, attributes, indices) {
    this._gl = gl;

    this._buffer = {};
    if (attributes.hasOwnProperty('position')) {
      this._buffer.position = new DataBuffer(this._gl, attributes.position, 3);
    }
    if (attributes.hasOwnProperty('normal')) {
     this._buffer.normal = new DataBuffer(this._gl, attributes.normal, 3);
    }
    if (attributes.hasOwnProperty('color')) {
     this._buffer.color = new DataBuffer(this._gl, attributes.color, 4);
    }
    if (attributes.hasOwnProperty('texture')) {
     this._buffer.texture = new DataBuffer(this._gl, attributes.texture, 2);
    }

    if (indices) {
      this._indices = new IndicesBuffer(this._gl);
    }

    this.vetricesCount = 0;
  }

  GeometryBuffer.prototype.bindAttributes = function (program) {
    if (this._buffer.hasOwnProperty('position')) {
      this._buffer.position.bindAttribute(program);
    }
    if (this._buffer.hasOwnProperty('normal')) {
      this._buffer.normal.bindAttribute(program);
    }
    if (this._buffer.hasOwnProperty('color')) {
      this._buffer.color.bindAttribute(program);
    }
    if (this._buffer.hasOwnProperty('texture')) {
      this._buffer.texture.bindAttribute(program);
    }
  };

  GeometryBuffer.prototype.setFigure = function (figure) {
    this.vetricesCount = figure.size;

    if (this._buffer.hasOwnProperty('position')) {
      this._buffer.position.setBuffer(figure.vetrices);
    }
    if (this._buffer.hasOwnProperty('normal')) {
      this._buffer.normal.setBuffer(figure.normals);
    }
    if (this._buffer.hasOwnProperty('color')) {
      this._buffer.color.setBuffer(figure.colors);
    }
    if (this._buffer.hasOwnProperty('texture')) {
      this._buffer.texture.setBuffer(figure.texture);
    }
    if (this._indices) {
      this._indices.setBuffer(figure.indices);
    }
  };

  function Texture(textureIndex, gl, texMap) {
    this._index = textureIndex;
    this._gl = gl;
    this._texMap = texMap;

    this.texture = this._gl.createTexture();
    this._gl.activeTexture(gl['TEXTURE' + this._index]);
    this._gl.bindTexture(this._gl.TEXTURE_2D, this.texture);
    this._gl.texParameteri(this._gl.TEXTURE_2D, this._gl.TEXTURE_WRAP_S, this._gl.REPEAT);
    this._gl.texParameteri(this._gl.TEXTURE_2D, this._gl.TEXTURE_WRAP_T, this._gl.REPEAT);
    this._gl.texParameteri(this._gl.TEXTURE_2D, this._gl.TEXTURE_MIN_FILTER, this._gl.NEAREST);
    this._gl.texParameteri(this._gl.TEXTURE_2D, this._gl.TEXTURE_MAG_FILTER, this._gl.NEAREST);
  }

  Texture.prototype.bindUniform = function () {
    this._gl.uniform1i(this._texMap, this._index);
  };

  Texture.prototype.setImage = function(image) {
    this._gl.bindTexture(this._gl.TEXTURE_2D, this.texture);
    this._gl.pixelStorei(this._gl.UNPACK_FLIP_Y_WEBGL, true);
    this._gl.texImage2D(this._gl.TEXTURE_2D, 0, this._gl.RGBA,
                        this._gl.RGBA, this._gl.UNSIGNED_BYTE,
                        image);
  };

  Texture.prototype.setPixel = function(color) {
    this._gl.bindTexture(this._gl.TEXTURE_2D, this.texture);
    this._gl.texImage2D(this._gl.TEXTURE_2D, 0, this._gl.RGBA,
                        1, 1,
                        0, this._gl.RGBA, this._gl.UNSIGNED_BYTE,
                        color);
  };

  function MtlObject(objDoc) {
    var info = objDoc.getDrawingInfo();

    this.size = info.indices.length;

    this.vetrices = info.vertices;
    this.normals = info.normals;
    this.colors = info.colors;
    this.indices = info.indices;
  }

  MtlObject.load = function (filepath, scale, reverse, callback) {
    var request = new XMLHttpRequest();

    request.onreadystatechange = function() {
      if (request.readyState === 4 && request.status !== 404) {
        var objDoc = new OBJDoc(filepath);
        var result = objDoc.parse(request.responseText, scale, reverse);

        if (!result) {
          callback(new Error('OBJ file parsing error.'), null);
        } else {
          (function recursive() {
            if (objDoc.isMTLComplete()) {
              callback(null, new MtlObject(objDoc));
            } else {
              setTimeout(recursive, 10);
            }
          })();
        }
      }
    };

    request.open('GET', filepath, true);
    request.send();
  }

  function Rect(shape, texture) {
    this.size = 6;
    this.vetrices = [
      shape[0], shape[1], shape[2],
      shape[0], shape[2], shape[3]
    ];
    this.texture = [
      texture[0], texture[1], texture[2],
      texture[0], texture[2], texture[3]
    ];
  }

  var draw = new Draw();
  var msPrRotation = 10000;
  let movement = true;
  let light = true;

  function render(timestamp) {
    // Calculate theta (radian angle)
    var ratio = (timestamp % msPrRotation) / msPrRotation;
    var theta = (ratio * 2 - 1) * Math.PI;

    var light = vec3(
      0 + Math.cos(theta) * 2,
      2,
      -2 + Math.sin(theta) * 2
    );

    if (movement) draw.setFigureOffset(Math.cos(theta) * 0.5 + 0.5);
    draw.setLightSource(light);
    draw.render();

    window.requestAnimationFrame(render);
  };

  draw.onready = function () {
    window.requestAnimationFrame(render);
  }

  var movementButton = document.querySelector('#movement');
  movementButton.addEventListener('click', function () {
    movement = !movement;
    movementButton.textContent = (movement ? 'Stop movement' : 'Start movement');
  });

  var lightButton = document.querySelector('#light');
  lightButton.addEventListener('click', function () {
    if (light) {
      document.querySelector('#kd').value = 0.0;
      document.querySelector('#ks').value = 0.0;
      lightButton.textContent = 'Turn light on';
      light = false;
    } else {
      document.querySelector('#kd').value = 0.7;
      document.querySelector('#ks').value = 0.5;
      lightButton.textContent = 'Turn light off';
      light = true;
    }
    draw.updateInputs();
  });

})();
