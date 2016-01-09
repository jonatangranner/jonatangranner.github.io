(function () {
  'use strict';

  function Draw() {
    var self = this;

    // Get context
    var canvas = document.querySelector('canvas');
    this._gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");


    // Enable depth test, this allows one to remove hidden surfaces
    // this._gl.enable(this._gl.DEPTH_TEST);

    // Set viewport and background color
    this._gl.viewport(0, 0, canvas.width, canvas.height);
    this._gl.clearColor(0.3921, 0.5843, 0.9294, 1.0);

    // Load sharders
    this._program = initShaders( this._gl, "vertex-shader", "fragment-shader" );
    this._gl.useProgram(this._program);

    // get attributes
    var uTexMap = this._gl.getUniformLocation(this._program, "texMap");
    var aPosition = this._gl.getAttribLocation(this._program, "aPosition");
    var aTexCoord = this._gl.getAttribLocation(this._program, "aTexCoord");

    // Intialize buffers
    this._geometries = [
      new GeometryBuffer(this._gl, aPosition, aTexCoord),
      new GeometryBuffer(this._gl, aPosition, aTexCoord)
    ];

    // Intialize texture
    this._texture = [
      new Texture(0, this._gl, uTexMap),
      new Texture(1, this._gl, uTexMap)
    ];

    // Model view
    var M = translate(-0.0, -0.0, -0.0);

    var eye = vec3(0.0, 0.0, 1);
    var at = vec3(0.0, 0.0, 0.0);
    var up = vec3(0.0, 1.0, 0.0);
    var V = lookAt(eye, at, up);

    var P = perspective(90, 1, 0.01, 30.0);

    this._screenV = V;
    this._shadowV = mat4();

    // Bind model uniforms
    var uM = this._gl.getUniformLocation(this._program, "uM");
    this._gl.uniformMatrix4fv(uM, false, flatten(M));

    this._uV = this._gl.getUniformLocation(this._program, "uV");

    var uP = this._gl.getUniformLocation(this._program, "uP");
    this._gl.uniformMatrix4fv(uP, false, flatten(P));

    // Setup objects
    this._addGround();
    this._addFigures();

    // Load textures
    this._loadImage('../text.png', function (image) {
      self._texture[0].setImage(image);
      self._texture[1].setPixel(new Uint8Array([255, 0, 0, 255]));

      self.onready();
    });
  }

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

    this._geometries[0].setFigure(rect);
  };

  Draw.prototype._addFigures = function () {
    //
    // Figure 1
    //
    var rectA = (function () {
      var shapeA = vec3(0.25, -0.5, -1.75);
      var shapeB = vec3(0.75, -0.5, -1.75);
      var shapeC = vec3(0.75, -0.5, -1.25);
      var shapeD = vec3(0.25, -0.5, -1.25);

      var textureA = vec2(0.25, -1.75);
      var textureB = vec2(0.75, -1.75);
      var textureC = vec2(0.75, -1.25);
      var textureD = vec2(0.25, -1.25);

      return new Rect(
        [shapeA, shapeB, shapeC, shapeD],
        [textureA, textureB, textureC, textureD]
      );
    })();

    var rectB = (function () {
      var shapeA = vec3(-1, +0, -3);
      var shapeB = vec3(-1, -1, -3);
      var shapeC = vec3(-1, -1, -2.5);
      var shapeD = vec3(-1, +0, -2.5);

      var textureA = vec2(+0, -3);
      var textureB = vec2(-1, -3);
      var textureC = vec2(-1, -2.5);
      var textureD = vec2(+0, -2.5);

      return new Rect(
        [shapeA, shapeB, shapeC, shapeD],
        [textureA, textureB, textureC, textureD]
      );
    })();

    var collection = new Collection([rectA, rectB]);
    this._geometries[1].setFigure(collection);
  };

  Draw.prototype.setLightSource = function (light) {
    var yplane = -1;
    var m = mat4(); // Shadow projection matrix initially an identity matrix
          m[3][3] = 0.0;
          m[3][1] = -1.0/(light[1] - yplane);

    var t_forward = translate(light[0], light[1], light[2]);
    var t_backward = translate(-light[0], -light[1], -light[2]);

    this._shadowV = mult(this._screenV, mult(mult(t_forward, m), t_backward));
  }

  Draw.prototype.render = function () {
    this._gl.clear(this._gl.COLOR_BUFFER_BIT);

    this._texture[0].bindUniform();
    this._geometries[0].bindAttributes();

    this._gl.uniformMatrix4fv(this._uV, false, flatten(this._screenV));
    this._gl.drawArrays(this._gl.TRIANGLES, 0, this._geometries[0].vetricesCount);

    this._texture[1].bindUniform();
    this._geometries[1].bindAttributes();

    this._gl.uniformMatrix4fv(this._uV, false, flatten(this._shadowV));
    this._gl.drawArrays(this._gl.TRIANGLES, 0, this._geometries[1].vetricesCount);

    this._gl.uniformMatrix4fv(this._uV, false, flatten(this._screenV));
    this._gl.drawArrays(this._gl.TRIANGLES, 0, this._geometries[1].vetricesCount);
  };

  function GeometryBuffer(gl, aPosition, aTexCoord) {
    this._gl = gl;

    this._aPosition = aPosition;
    this._aTexCoord = aTexCoord;

    this.vetricesCount = 0;
    this.shape = this._gl.createBuffer();
    this.texture = this._gl.createBuffer();
  }

  GeometryBuffer.prototype.bindAttributes = function () {
    // Bind attributes
    this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this.shape);
    this._gl.vertexAttribPointer(this._aPosition, 3, this._gl.FLOAT, false, 0, 0);
    this._gl.enableVertexAttribArray(this._aPosition);

    this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this.texture);
    this._gl.vertexAttribPointer(this._aTexCoord, 2, this._gl.FLOAT, false, 0, 0);
    this._gl.enableVertexAttribArray(this._aTexCoord);
  };

  GeometryBuffer.prototype.setFigure = function (figure) {
    this.vetricesCount = figure.size;

    this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this.shape);
    this._gl.bufferData(this._gl.ARRAY_BUFFER, flatten(figure.shapeVetrices), this._gl.STATIC_DRAW);

    this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this.texture);
    this._gl.bufferData(this._gl.ARRAY_BUFFER, flatten(figure.textureVetrices), this._gl.STATIC_DRAW);
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

  Texture.prototype.bindUniform = function (first_argument) {
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

  function Rect(shape, texture) {
    this.size = 6;
    this.shapeVetrices = [
      shape[0], shape[1], shape[2],
      shape[0], shape[2], shape[3]
    ];
    this.textureVetrices = [
      texture[0], texture[1], texture[2],
      texture[0], texture[2], texture[3]
    ];
  }

  function Collection(objects) {
    this.shapeVetrices = Array.prototype.concat.apply([], objects.map(function (object) { return object.shapeVetrices; }));
    this.textureVetrices = Array.prototype.concat.apply([], objects.map(function (object) { return object.textureVetrices; }));
    this.size = this.shapeVetrices.length;
  }

  var draw = new Draw();
  var msPrRotation = 10000;

  function render(timestamp) {
    // Calculate theta (radian angle)
    var ratio = (timestamp % msPrRotation) / msPrRotation;
    var theta = (ratio * 2 - 1) * Math.PI;

    var light = vec3(
      0 + Math.cos(theta) * 2,
      2,
      -2 + Math.sin(theta) * 2
    );

    draw.setLightSource(light);
    draw.render();

    window.requestAnimationFrame(render);
  };

  draw.onready = function () {
    window.requestAnimationFrame(render);
  }
})();
