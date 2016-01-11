var canvas;
var gl;
var program; 
var groundtex;
var redtex;
window.onload = init;

function init(){   
    var va0 = vec4(-2.0,-1.0,1.0,1.0); var vb0 = vec4(2.0,-1.0,1.0,1.0); var vc0 = vec4(2.0,-1.0,-3.0,1.0); var vd0 = vec4(-2.0,-1.0,-3.0,1.0);
    var va1 = vec4(0.25,-0.5,-1.25,1.0); var vb1 = vec4(0.75,-0.5,-1.25,1.0); var vc1 = vec4(0.75,-0.5,-1.75,1.0); var vd1 = vec4(0.25,-0.5,-1.75,1.0);
    var va2 = vec4(-1.0,-1.0,-2,1.0); var vb2 = vec4(-1.0,0.0,-2,1.0); var vc2 = vec4(-1.0,0.0,-3.0,1.0); var vd2 = vec4(-1.0,-1.0,-3.0,1.0);
    var vertices = [vb0,vc0,va0,vd0, 
                    vb1,vc1,va1,vd1, 
                    vb2,vc2,va2,vd2];
    var shadow
    var ta = vec2(1.0, 0.0); var tb = vec2(1.0, 1.0); var tc = vec2(-1.0, 0.0); var td = vec2(-1.0, 1.0);
    var texCoords = [ta,tb,tc,td,
                     ta,tb,tc,td,
                     ta,tb,tc,td];
    canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas);

    getShaders();
    
    initTexture();

    initBuffers(vertices,texCoords);

    drawScene();
}
    
function getShaders() {
    program = initShaders( gl, "vShader", "fShader" );
    gl.useProgram(program); 
}
    
function initBuffers(vertices,texCoords) {
    PositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, PositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);
    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    var TextureBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, TextureBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(texCoords), gl.STATIC_DRAW);
    var vTexCoord = gl.getAttribLocation(program, "vTexCoord");
    gl.vertexAttribPointer(vTexCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vTexCoord);
}

function initTexture(){
    gl.Texture0 = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, gl.Texture0);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    var groundtex = document.getElementById("ground");
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, groundtex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);  
    gl.uniform1i(gl.getUniformLocation(program, "texMap"), 0);

    
    gl.Texture1 = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, gl.Texture1);
    var redtex = createTex(200);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 64, 64, 0, gl.RGBA, gl.UNSIGNED_BYTE, redtex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);  
    gl.uniform1i(gl.getUniformLocation(program, "texMap"), 1);
    
    gl.Texture2 = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, gl.Texture2);
    var redtex = createTex(0);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 64, 64, 0, gl.RGBA, gl.UNSIGNED_BYTE, redtex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);  
    gl.uniform1i(gl.getUniformLocation(program, "texMap"), 2);
}

function createTex(color) {
    var texSize = 64;
    var numRows = 8;
    var numCols = 8;
    var tex = new Uint8Array(4*texSize*texSize);
    
    for (var i = 0; i < texSize; ++i) {
        for (var j = 0; j < texSize; ++j) {
            var patchx = Math.floor(i/(texSize/numRows));
            var patchy = Math.floor(j/(texSize/numCols));
            tex[4*i*texSize+4*j] = color;
            tex[4*i*texSize+4*j+1] = 0;
            tex[4*i*texSize+4*j+2] = 0;
            tex[4*i*texSize+4*j+3] = 255;
        }
    }
    return tex;
}

var ShadowMatrixLoc;
function drawScene() {  

    gl.viewport(0, 0, 500,500);
    gl.clearColor(0.3921, 0.5843, 0.9294, 1.0); 
    gl.enable(gl.DEPTH_TEST);
    
    var PerspMatrixLoc = gl.getUniformLocation(program,'PerspMatrix');
    var ModelMatrixLoc = gl.getUniformLocation(program,'ModelMatrix');   
    var LookAtMatrixLoc = gl.getUniformLocation(program,'LookAtMatrix');
    ShadowMatrixLoc = gl.getUniformLocation(program,'ShadowMatrix');
    
    var PerspMatrix = perspective(90,1,0.1,10);
    var ModelMatrix = mult(rotate(0,vec3(1,0,0)), translate(vec3(0,0,0)));
    var LookAtMatrix = mat4();
    
    gl.uniformMatrix4fv(ModelMatrixLoc,false,flatten(ModelMatrix)); 
    gl.uniformMatrix4fv(PerspMatrixLoc,false,flatten(PerspMatrix));
    gl.uniformMatrix4fv(LookAtMatrixLoc,false,flatten(LookAtMatrix));

    render();
}

var phi = 0;
function render(){
    setTimeout(function() {
    
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.depthFunc(gl.LESS);
    gl.uniformMatrix4fv(ShadowMatrixLoc,false,flatten(mat4())); 
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, gl.Texture0);
    gl.uniform1i(gl.getUniformLocation(program, "texMap"), 0); 
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, gl.Texture2);
    gl.uniform1i(gl.getUniformLocation(program, "texMap"), 2);
    gl.depthFunc(gl.GREATER);   
    var light = vec3(0+2*Math.cos(phi),2,-2+2*Math.sin(phi));
    var minuslight = vec3(0-2*Math.cos(phi),-2,2-2*Math.sin(phi));//=-light
    var ShadowMatrix = mat4();
    ShadowMatrix[3][3]=0; 
    ShadowMatrix[3][1]=1/(-2-1.01);
    var ShadowTranslate = translate(minuslight);
    var ShadowTranslateBack = translate(light);
    ShadowMatrix = mult(ShadowTranslateBack, mult(ShadowMatrix, ShadowTranslate));
    gl.uniformMatrix4fv(ShadowMatrixLoc,false,flatten(ShadowMatrix));   
    gl.drawArrays(gl.TRIANGLE_STRIP, 4, 4);
    gl.drawArrays(gl.TRIANGLE_STRIP, 8, 4);
    gl.depthFunc(gl.LESS);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, gl.Texture1);
    gl.uniform1i(gl.getUniformLocation(program, "texMap"), 1);
    gl.uniformMatrix4fv(ShadowMatrixLoc,false,flatten(mat4()))
    gl.drawArrays(gl.TRIANGLE_STRIP, 4, 4);
    gl.drawArrays(gl.TRIANGLE_STRIP, 8, 4);
    
        requestAnimFrame(render);
        phi+=0.1;
    }, 100);
}
    

