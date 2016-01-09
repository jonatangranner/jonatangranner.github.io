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
    this._size = [canvas.width, canvas.height];
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
      new Texture(0, this._gl, this._program.texture.getUniformLocation("shadowMap"), { repeatS: false, repeatT: false }),
      new Texture(1, this._gl, this._program.texture.getUniformLocation("texMap"), { repeatS: true, repeatT: true })
    ];
    this._shadowMap = new FrameBuffer(this._gl, this._texture[0], [512, 512]);

    // Model view
    var screenV = (function () {
    var eye = vec3(0.0, 0.0, 1);
    var at = vec3(0.0, 0.0, -3.0);
    var up = vec3(0.0, 1.0, 0.0);
      return lookAt(eye, at, up);
    })();

    var debugV = (function () {
    var eye = vec3(0.0, 2.0, -3.001);
    var at = vec3(0.0, 0.0, -3.0);
    var up = vec3(0.0, 1.0, 0.0);
    return lookAt(eye, at, up);
    })();

    var P = perspective(65, 1, 0.01, 30.0);

    this._screenV = screenV;
    this._lightV = mat4();
    this._figureM = mat4();
    this._light = vec4();

    this._onR = mat4();
    this._onR[1][1] = -1;
    this._onR = mult(translate(0, -2, 0), this._onR);

    this._offR = mat4();

    // Bind model uniforms
    this._program.texture.use();
    var groundM = translate(-0.0, -0.0, -0.0);
    this._uGroundLightV = this._program.texture.getUniformLocation("uLightV");
    this._gl.uniformMatrix4fv(this._program.texture.getUniformLocation("uM"), false, flatten(groundM));
    this._gl.uniformMatrix4fv(this._program.texture.getUniformLocation("uV"), false, flatten(this._screenV));
    this._gl.uniformMatrix4fv(this._program.texture.getUniformLocation("uP"), false, flatten(P));

    this._program.figure.use();
    this._uFigureM = this._program.figure.getUniformLocation("uM");
    this._uFigureR = this._program.figure.getUniformLocation("uR");
    this._uFigureLight = this._program.figure.getUniformLocation("lightDirection");
    this._uFigureLightV = this._program.figure.getUniformLocation("uLightV");
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
        self._texture[1].setImage(image);

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
    var at = vec3(0.0, -1.0, -3.0);
    var eye = add(at, light);
    var up = vec3(0.0, 1.0, 0.0);

    this._light = vec4(-light[0], -light[1], -light[2], 0);
    this._lightV = lookAt(eye, at, up);
  };

  Draw.prototype.setFigureOffset = function (offset) {
    this._figureM = translate(-0.0, -1.0 + offset, -3.0);
  };

  Draw.prototype.render = function () {
    // Draw shadow on the extern frame buffer
    this._program.shadow.use();
    this._shadowMap.bindFrameBuffer();
    this._gl.clear(this._gl.COLOR_BUFFER_BIT | this._gl.DEPTH_BUFFER_BIT);

    this._geometries.figure.bindAttributes(this._program.shadow);
    this._gl.uniformMatrix4fv(this._uShadowV, false, flatten(this._lightV));
    this._gl.uniformMatrix4fv(this._uShadowM, false, flatten(this._figureM));
    this._gl.drawElements(this._gl.TRIANGLES, this._geometries.figure.vetricesCount, this._gl.UNSIGNED_SHORT, 0);

    // Swich to canvas buffer
    this._shadowMap.unbindFrameBuffer();
    this._gl.viewport(0, 0, this._size[0], this._size[1]);
    this._gl.clear(this._gl.COLOR_BUFFER_BIT | this._gl.DEPTH_BUFFER_BIT);

    // Draw ground
    /*
    this._program.texture.use();

    this._geometries.ground.bindAttributes(this._program.texture);
    this._gl.uniformMatrix4fv(this._uGroundLightV, false, flatten(this._lightV));
    this._texture[0].bindUniform();
    this._texture[1].bindUniform();

    this._gl.drawArrays(this._gl.TRIANGLES, 0, this._geometries.ground.vetricesCount);
    */

    // Draw figure
    this._program.figure.use();

    this._geometries.figure.bindAttributes(this._program.figure);
    this._gl.uniform4fv(this._uFigureLight, flatten(this._light));
    this._gl.uniformMatrix4fv(this._uFigureLightV, false, flatten(this._lightV));
    this._gl.uniformMatrix4fv(this._uFigureR, false, flatten(this._offR));
    this._gl.uniformMatrix4fv(this._uFigureM, false, flatten(this._figureM));

    this._gl.drawElements(this._gl.TRIANGLES, this._geometries.figure.vetricesCount, this._gl.UNSIGNED_SHORT, 0);

    // Draw reflected figure
    this._program.figure.use();

    this._geometries.figure.bindAttributes(this._program.figure);
    this._gl.uniform4fv(this._uFigureLight, flatten(this._light));
    this._gl.uniformMatrix4fv(this._uFigureLightV, false, flatten(this._lightV));
    this._gl.uniformMatrix4fv(this._uFigureR, false, flatten(this._onR));
    this._gl.uniformMatrix4fv(this._uFigureM, false, flatten(this._figureM));

    this._gl.drawElements(this._gl.TRIANGLES, this._geometries.figure.vetricesCount, this._gl.UNSIGNED_SHORT, 0);
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

  function FrameBuffer(gl, texture, size) {
    this._gl = gl;
    this._size = size;
    this._frameBuffer = this._gl.createFramebuffer();
    this._depthBuffer = this._gl.createRenderbuffer();

    texture.setEmpty(this._size);

    // Configure depth buffer
    this._gl.bindRenderbuffer(this._gl.RENDERBUFFER, this._depthBuffer);
    this._gl.renderbufferStorage(
      this._gl.RENDERBUFFER, this._gl.DEPTH_COMPONENT16,
      this._size[0], this._size[1]
    );

    // Attach texture and renderbuffer
    this._gl.bindFramebuffer(this._gl.FRAMEBUFFER, this._frameBuffer);
    this._gl.framebufferTexture2D(
      this._gl.FRAMEBUFFER, this._gl.COLOR_ATTACHMENT0,
      this._gl.TEXTURE_2D, texture.texture, 0
    );

    this._gl.framebufferRenderbuffer(
      this._gl.FRAMEBUFFER, this._gl.DEPTH_ATTACHMENT,
      this._gl.RENDERBUFFER, this._depthBuffer
    );
    // Unbind the framebuffer, thus preventing sideeffects
    this._gl.bindFramebuffer(this._gl.FRAMEBUFFER, null);

    // Check for errors
    var e = this._gl.checkFramebufferStatus(this._gl.FRAMEBUFFER);

    // see https://www.opengl.org/sdk/docs/man3/xhtml/glCheckFramebufferStatus.xml
    // for possible errors.
    var statusCodes = [
      'FRAMEBUFFER_UNDEFINED',
      'FRAMEBUFFER_INCOMPLETE_ATTACHMENT',
      'FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT',
      'FRAMEBUFFER_INCOMPLETE_DRAW_BUFFER',
      'FRAMEBUFFER_INCOMPLETE_READ_BUFFER',
      'FRAMEBUFFER_UNSUPPORTED',
      'FRAMEBUFFER_INCOMPLETE_MULTISAMPLE',
      'FRAMEBUFFER_INCOMPLETE_MULTISAMPLE',
      'FRAMEBUFFER_INCOMPLETE_LAYER_TARGETS'
    ];

    if (e !== this._gl.FRAMEBUFFER_COMPLETE) {
      let errorName = 'Unknown status (' + e.toString() + ')';
      statusCodes.forEach(function (codeName) {
        if (this._gl[codeName] === e) {
          errorName = codeName;
        }
      }, this);

      throw new Error('Framebuffer object is incomplete: ' + errorName);
    }
  }

  FrameBuffer.prototype.bindFrameBuffer = function () {
    this._gl.bindFramebuffer(this._gl.FRAMEBUFFER, this._frameBuffer);
    this._gl.viewport(0, 0, this._size[0], this._size[1]);
  };

  FrameBuffer.prototype.unbindFrameBuffer = function () {
    this._gl.bindFramebuffer(this._gl.FRAMEBUFFER, null);
  };

  function Texture(textureIndex, gl, texMap, options) {
    this._index = textureIndex;
    this._gl = gl;
    this._texMap = texMap;

    this.texture = this._gl.createTexture();
    this._gl.activeTexture(gl['TEXTURE' + this._index]);
    this._gl.bindTexture(this._gl.TEXTURE_2D, this.texture);
    this._gl.texParameteri(this._gl.TEXTURE_2D, this._gl.TEXTURE_WRAP_S, options.repeatS ? this._gl.REPEAT : this._gl.CLAMP_TO_EDGE);
    this._gl.texParameteri(this._gl.TEXTURE_2D, this._gl.TEXTURE_WRAP_T, options.repeatT ? this._gl.REPEAT : this._gl.CLAMP_TO_EDGE);
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

  Texture.prototype.setEmpty = function(size) {
    this._gl.bindTexture(this._gl.TEXTURE_2D, this.texture);
    this._gl.texImage2D(this._gl.TEXTURE_2D, 0, this._gl.RGBA,
                        size[0], size[1],
                        0, this._gl.RGBA, this._gl.UNSIGNED_BYTE,
                        null);
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
      0 + Math.sin(theta) * 2
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
