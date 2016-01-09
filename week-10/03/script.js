(function () {
  'use strict';

  function Draw() {
    var self = this;

    // Get context
    var canvas = document.querySelector('canvas');
    this._gl = canvas.getContext("webgl", { alpha: false }) || canvas.getContext("experimental-webgl", { alpha: false });

    // Enable depth test, this allows one to remove hidden surfaces
    this._gl.enable(this._gl.DEPTH_TEST);
    this._gl.enable(this._gl.POLYGON_OFFSET_FILL);
    this._gl.enable(this._gl.BLEND);

    // The color should be t*alpha + s*(1-alpha)
    this._gl.blendFunc(this._gl.SRC_ALPHA, this._gl.ONE_MINUS_SRC_ALPHA);

    // Set viewport and background color
    this._size = [canvas.width, canvas.height];
    this._gl.clearColor(0.3921, 0.5843, 0.9294, 1.0);

    // Set viewport
    this._gl.viewport(0, 0, this._size[0], this._size[1]);

    // Load sharders
    this._program = {
      sphere: new Program(this._gl, 'sphere'),
      background: new Program(this._gl, 'background')
    };

    // Intialize buffers
    this._geometries = {
      sphere: new GeometryBuffer(this._gl, {
        normal: "aNormal",
        position: "aPosition"
      }, false),
      background: new GeometryBuffer(this._gl, {
        position: "aPosition"
      }, false)
    };

    // Intialize texture
    this._texture = {
      envMap: new Texture(this._gl, 0, { type: 'CUBE', linear: true })
    };

    // Model view
    var eye = vec3(0.0, 0.0, 3);
    var V = (function () {
      var at = vec3(0.0, 0.0, 0.0);
      var up = vec3(0.0, 1.0, 0.0);
      return lookAt(eye, at, up);
    })();
    var Vrot = mat4();

    var P = perspective(90, 1, 0.01, 30.0);

    var M = translate(0, 0, 0);

    // Bind model uniforms
    this._program.sphere.use();
    this._texture.envMap.bindUniform(this._program.sphere.getUniformLocation("envMap"));
    this._gl.uniform3fv(this._program.sphere.getUniformLocation("eye"), flatten(eye));
    this._gl.uniformMatrix4fv(this._program.sphere.getUniformLocation("uM"), false, flatten(M));
    this._gl.uniformMatrix4fv(this._program.sphere.getUniformLocation("uV"), false, flatten(V));
    this._gl.uniformMatrix4fv(this._program.sphere.getUniformLocation("uP"), false, flatten(P));

    this._program.background.use();
    this._texture.envMap.bindUniform(this._program.background.getUniformLocation("envMap"));
    this._gl.uniformMatrix4fv(this._program.background.getUniformLocation("uMinv"), false, flatten(inverse(M)));
    this._gl.uniformMatrix4fv(this._program.background.getUniformLocation("uVinv"), false, flatten(inverse(Vrot)));
    this._gl.uniformMatrix4fv(this._program.background.getUniformLocation("uPinv"), false, flatten(inverse(P)));

    // Setup light and material settings input
    this._listeners = [];
    var lightSettings = ['ka', 'kd', 'ks', 'alpha'];
    lightSettings.forEach(function (name) {
      var uniformRef = this._program.sphere.getUniformLocation("u_" + name);
      this._addInput(name, function (value) {
        self._program.sphere.use();
        self._gl.uniform1f(uniformRef, parseFloat(value));
      });
    }, this);

    // Load textures
    this._geometries.sphere.setFigure(new Sphere(5));
    this._geometries.background.setFigure(new Quad([1, 1, 0.999], [1, -1, 0.999], [-1, -1, 0.999], [-1, 1, 0.999]));
    this._texture.envMap.loadImage({
      positiveX: '../textures/cm_left.png',
      negativeX: '../textures/cm_right.png',
      positiveY: '../textures/cm_top.png',
      negativeY: '../textures/cm_bottom.png',
      positiveZ: '../textures/cm_back.png',
      negativeZ: '../textures/cm_front.png'
    }, function (err) {
      if (err) throw err;
      self.onready();
    });
  }

  Draw.prototype._addInput = function (id, callback) {
    var elem = document.getElementById(id);
    var eventName = (elem.tagName === 'INPUT' ? 'input' : 'change');
    elem.addEventListener(eventName, function () {
      callback(elem.value);
    });
    callback(elem.value);
  };

  Draw.prototype.render = function () {
    this._gl.clear(this._gl.COLOR_BUFFER_BIT | this._gl.DEPTH_BUFFER_BIT);

    this._program.sphere.use();
    this._geometries.sphere.bindAttributes(this._program.sphere);
    this._gl.drawArrays(this._gl.TRIANGLES, 0, this._geometries.sphere.vetricesCount);

    this._program.background.use();
    this._geometries.background.bindAttributes(this._program.background);
    this._gl.drawArrays(this._gl.TRIANGLES, 0, this._geometries.background.vetricesCount);
  };

  //
  // Framework
  //
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

  function Texture(gl, textureIndex, options) {
    options = options || {};

    this._index = textureIndex;
    this._gl = gl;

    switch (options.type) {
      case 'CUBE':
        this._type = this._gl.TEXTURE_CUBE_MAP;
        break;

      case '2D':
      default:
        this._type = this._gl.TEXTURE_2D;
        break;
    }

    this.texture = this._gl.createTexture();
    this._gl.activeTexture(gl['TEXTURE' + this._index]);
    this._gl.bindTexture(this._type, this.texture);
    this._gl.texParameteri(this._type, this._gl.TEXTURE_WRAP_S, options.repeat ? this._gl.REPEAT : this._gl.CLAMP_TO_EDGE);
    this._gl.texParameteri(this._type, this._gl.TEXTURE_WRAP_T, options.repeat ? this._gl.REPEAT : this._gl.CLAMP_TO_EDGE);
    this._gl.texParameteri(this._type, this._gl.TEXTURE_MIN_FILTER, options.linear ? this._gl.LINEAR : this._gl.NEAREST);
    this._gl.texParameteri(this._type, this._gl.TEXTURE_MAG_FILTER, options.linear ? this._gl.LINEAR : this._gl.NEAREST);
  }

  Texture.prototype.bindUniform = function (uniform) {
    this._gl.uniform1i(uniform, this._index);
  };

  Texture.prototype._load2dImage = function(src, callback) {
      var image = new Image();
      image.addEventListener('load', function() {
        callback(null, image);
      });
      image.addEventListener('error', function(event) {
        callback(new Error('could not load ' + src), null);
      });
      image.src = src;
  };

  Texture.prototype._loadCubeImage = function (src, callback) {
    let remaning = 6;
    var result = {};
    Object.keys(src).forEach(function (key) {
      this._load2dImage(src[key], function (err, image) {
        if (err) return callback(err);

        result[key] = image;
        if (--remaning === 0) {
          callback(null, result);
        }
      });
    }, this);
  };

  Texture.prototype.loadImage = function (href, callback) {
    var self = this;
    if (this._type === this._gl.TEXTURE_2D) {
      this._load2dImage(href, onload);
    } else if (this._type === this._gl.TEXTURE_CUBE_MAP) {
      this._loadCubeImage(href, onload);
    }

    function onload(err, image) {
      if (err) return callback(err);
      self.setImage(image);
      callback(null);
    }
  };

  Texture.prototype._setCubeImage = function(image) {
    this._gl.texImage2D(this._gl.TEXTURE_CUBE_MAP_POSITIVE_X, 0, this._gl.RGBA,
                        this._gl.RGBA, this._gl.UNSIGNED_BYTE,
                        image.positiveX);

    this._gl.texImage2D(this._gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 0, this._gl.RGBA,
                        this._gl.RGBA, this._gl.UNSIGNED_BYTE,
                        image.negativeX);

    this._gl.texImage2D(this._gl.TEXTURE_CUBE_MAP_POSITIVE_Y, 0, this._gl.RGBA,
                        this._gl.RGBA, this._gl.UNSIGNED_BYTE,
                        image.positiveY);

    this._gl.texImage2D(this._gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 0, this._gl.RGBA,
                        this._gl.RGBA, this._gl.UNSIGNED_BYTE,
                        image.negativeY);

    this._gl.texImage2D(this._gl.TEXTURE_CUBE_MAP_POSITIVE_Z, 0, this._gl.RGBA,
                        this._gl.RGBA, this._gl.UNSIGNED_BYTE,
                        image.positiveZ);

    this._gl.texImage2D(this._gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 0, this._gl.RGBA,
                        this._gl.RGBA, this._gl.UNSIGNED_BYTE,
                        image.negativeZ);
  };

  Texture.prototype._set2dImage = function(image) {
    this._gl.texImage2D(this._gl.TEXTURE_2D, 0, this._gl.RGBA,
                        this._gl.RGBA, this._gl.UNSIGNED_BYTE,
                        image);
  };

  Texture.prototype.setImage = function(image) {
    this._gl.bindTexture(this._type, this.texture);
    this._gl.pixelStorei(this._gl.UNPACK_FLIP_Y_WEBGL, true);

    if (this._type === this._gl.TEXTURE_2D) {
      this._set2dImage(image);
    } else if (this._type === this._gl.TEXTURE_CUBE_MAP) {
      this._setCubeImage(image);
    }
  };

  Texture.prototype.setEmpty = function(size) {
    if (this._type === this._gl.TEXTURE_CUBE_MAP) {
      throw new Error('not implemented');
    }

    this._gl.bindTexture(this._type, this.texture);
    this._gl.texImage2D(this._gl.TEXTURE_2D, 0, this._gl.RGBA,
                        size[0], size[1],
                        0, this._gl.RGBA, this._gl.UNSIGNED_BYTE,
                        null);
  };

  Texture.prototype.setPixel = function(color) {
    if (this._type === this._gl.TEXTURE_CUBE_MAP) {
      throw new Error('not implemented');
    }

    this._gl.bindTexture(this._gl.TEXTURE_2D, this.texture);
    this._gl.texImage2D(this._gl.TEXTURE_2D, 0, this._gl.RGBA,
                        1, 1,
                        0, this._gl.RGBA, this._gl.UNSIGNED_BYTE,
                        color);
  };

  function Quad(a, b, c, d) {
    this.vetrices = [
      a, b, c,
      a, c, d
    ];
    this.size = 6;
  }

  function Sphere(subdivitions) {
    this.vetrices = [];
    this.normals = [];

    var va = vec4(0.0, 0.0, -1.0, 1);
    var vb = vec4(0.0, 0.942809, 0.333333, 1);
    var vc = vec4(-0.816497, -0.471405, 0.333333, 1);
    var vd = vec4(0.816497, -0.471405, 0.333333, 1);

    this._tetrahedron(va, vb, vc, vd, subdivitions);

    this.size = this.vetrices.length;
  }

  Sphere.prototype._tetrahedron = function (a, b, c, d, n) {
    this._divideTriangle(a, b, c, n);
    this._divideTriangle(d, c, b, n);
    this._divideTriangle(a, d, b, n);
    this._divideTriangle(a, c, d, n);
  };

  Sphere.prototype._divideTriangle = function (a, b, c, n) {
    if (n > 0) {
      var ab = normalize(mix(a, b, 0.5), true);
      var ac = normalize(mix(a, c, 0.5), true);
      var bc = normalize(mix(b, c, 0.5), true);

      this._divideTriangle(a, ab, ac, n - 1);
      this._divideTriangle(ab, b, bc, n - 1);
      this._divideTriangle(bc, c, ac, n - 1);
      this._divideTriangle(ab, bc, ac, n - 1);
    } else {
      this._triangle(vec3(a), vec3(b), vec3(c));
    }
  };

  Sphere.prototype._triangle = function (a, b, c){
    this.normals.push(a);
    this.normals.push(b);
    this.normals.push(c);

    this.vetrices.push(a);
    this.vetrices.push(b);
    this.vetrices.push(c);
  };

  var draw = new Draw();
  var msPrRotation = 10000;

  function render(timestamp) {
    // Calculate theta (radian angle)
    var ratio = (timestamp % msPrRotation) / msPrRotation;
    var theta = (ratio * 2 - 1) * Math.PI;

    draw.render();

    window.requestAnimationFrame(render);
  };

  draw.onready = function () {
    window.requestAnimationFrame(render);
  }
})();
