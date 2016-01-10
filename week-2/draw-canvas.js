

var canvas;
var gl;


var maxNumTriangles = 200;  
var maxNumVertices  = 3 * maxNumTriangles;

var index = 0;
var pIndex = 0;
var tIndex = 0;
var cindex = 0;

var tDraw = true;

var rvalue = 0;
var gvalue = 0;
var bvalue = 0;

var pIndices = [];
var tIndices = [];

var t1, t2, t3;
var vCount = 0;

var colors = [
    vec4( 0.0, 0.0, 0.0, 1.0 ),
    vec4( 1.0, 0.0, 0.0, 1.0 ),
    vec4( 1.0, 1.0, 0.0, 1.0 ),
    vec4( 0.0, 1.0, 0.0, 1.0 ),
    vec4( 0.0, 0.0, 1.0, 1.0 ),
    vec4( 1.0, 0.0, 1.0, 1.0 ),
    vec4( 0.0, 1.0, 1.0, 1.0 )
];

function setRGB(cindex){
    var t = vec4(colors[cindex]);
    rvalue = t[0];
    gvalue = t[1];
    bvalue = t[2];
}

window.onload = function init() {
    canvas = document.getElementById( "gl-canvas" );
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    var m = document.getElementById("color-menu");
    
    m.addEventListener("click", function() {
       cindex = m.selectedIndex;
        });

    var n = document.getElementById("draw-menu");
    
    n.addEventListener("click", function() {
       if(n.selectedIndex == 0){
        tDraw = true;
       }
       else {
        tDraw = false;
       }
        });
    
    canvas.addEventListener("mousedown", function(event){
        gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
        var t = vec2(2*event.clientX/canvas.width-1, 
           2*(canvas.height-event.clientY)/canvas.height-1);
        if(tDraw){
            if(vCount == 2){
                tIndices.push(t);
                s = tIndices.length;
                gl.bufferSubData(gl.ARRAY_BUFFER, 8*tIndex, flatten(t));
                gl.bufferSubData(gl.ARRAY_BUFFER, 8*(tIndex+1), flatten(tIndices[s-2]));
                gl.bufferSubData(gl.ARRAY_BUFFER, 8*(tIndex+2), flatten(tIndices[s-3]));
                tIndex += 3;

                gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
                t = vec4(colors[cindex]);
                gl.bufferSubData(gl.ARRAY_BUFFER, 16*(tIndex-3), flatten(t));
                gl.bufferSubData(gl.ARRAY_BUFFER, 16*(tIndex-2), flatten(t));
                gl.bufferSubData(gl.ARRAY_BUFFER, 16*(tIndex-1), flatten(t));
                vCount = 0;
            }
            else {
                tIndices.push(t);
                vCount++;
                console.log(vCount);
            }
            
        }
        else {
            pIndices.push(t);
            gl.bufferSubData(gl.ARRAY_BUFFER, 8*pIndex, flatten(pIndices[pIndex]));

            gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
            t = vec4(colors[cindex]);
            gl.bufferSubData(gl.ARRAY_BUFFER, 16*pIndex, flatten(t));
            pIndex++;
            
        }
    } );

    btnCanvasClear = document.getElementById( "clear-canvas" );

    btnCanvasClear.addEventListener("click", function(){
        setRGB(cindex);
        gl.clearColor(rvalue, gvalue, bvalue, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        
    });


    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor(0.3921, 0.5843, 0.9294, 1.0);
    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );
    
    
    var vBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData( gl.ARRAY_BUFFER, 8*maxNumVertices, gl.STATIC_DRAW );
    
    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
    
    var cBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, 16*maxNumVertices, gl.STATIC_DRAW );
    
    var vColor = gl.getAttribLocation( program, "vColor" );
    gl.vertexAttribPointer( vColor, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vColor );

    render();

}


function render() {
    
    gl.clear( gl.COLOR_BUFFER_BIT );
    gl.drawArrays( gl.POINTS, 0, pIndex );
    for(var i = 0; i<tIndex; i+=3){
        gl.drawArrays( gl.TRIANGLES, tIndex-3, 3 );
    }

    window.requestAnimFrame(render);

}
