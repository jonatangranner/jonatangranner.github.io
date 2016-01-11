
var canvas;
var gl;

var maxNumTriangles = 200;  
var maxNumVertices  = 3 * maxNumTriangles;
var index = 0;
var first = true;

var t1, t2;
var tCoords = new Array();
var pCoords = new Array();
var cCoords = new Array();

var x,y;
var shapes = new Array();
var cIndex = 0;

var vBuffer;
var cBuffer;

var colors = [
    vec4( 0.0, 0.0, 0.0, 1.0 ),
    vec4( 1.0, 0.0, 0.0, 1.0 ),
    vec4( 1.0, 1.0, 0.0, 1.0 ),
    vec4( 0.0, 1.0, 0.0, 1.0 ),
    vec4( 0.0, 0.0, 1.0, 1.0 ),
    vec4( 1.0, 0.0, 1.0, 1.0 ),
    vec4( 0.0, 1.0, 1.0, 1.0 )
];

window.onload = function init() {

canvas = document.getElementById( "gl-canvas" );
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }
    
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.3921, 0.5843, 0.9294, 1.0 );
    gl.clear( gl.COLOR_BUFFER_BIT );

    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );
    
    
    vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, 8*maxNumVertices, gl.STATIC_DRAW);
    
    var vPosition = gl.getAttribLocation( program, "vPosition");
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
    
    cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, 16*maxNumVertices, gl.STATIC_DRAW );
    
    var vColor = gl.getAttribLocation( program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);
    
    var m = document.getElementById("draw-menu");
    var type = 1;
    m.addEventListener("click", function() {
       type = m.selectedIndex + 1;
    });

    var n = document.getElementById("color-menu");
    cIndex = 0;
    n.addEventListener("click", function() {
       cIndex = n.selectedIndex;
    });
    
    var numClick = 0;
    var rad = 0;

    document.getElementById('clear-canvas').addEventListener('click', function() {
        gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer);
        gl.bufferData( gl.ARRAY_BUFFER, 8*maxNumVertices, gl.STATIC_DRAW );  
        gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer);
        gl.bufferData( gl.ARRAY_BUFFER, 16*maxNumVertices, gl.STATIC_DRAW ); 
        index = 0;
        shapes.length = 0;
        gl.clear( gl.COLOR_BUFFER_BIT );
        
      });

    canvas.addEventListener("mousedown", function(event){
        
        if (type == 1) {
            
            gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer);
            rect = canvas.getBoundingClientRect();
            x = event.clientX - rect.left;
            y = event.clientY - rect.top;
            t1 = vec2(2*x/canvas.width-1, 
                2*(canvas.height-y)/canvas.height-1);
            pCoords.push(t1);
            
            gl.bufferSubData(gl.ARRAY_BUFFER, 8*index, flatten(pCoords.pop() ));
            gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer);
            shapes.push(1);
            index++;
            
            t = vec4(colors[cIndex]);
            
            gl.bufferSubData(gl.ARRAY_BUFFER, 16*(index-1), flatten(t));
        }
        
        if (type == 2) {
        
        gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer);
            
            if(numClick < 2) {
              
              numClick += 1;
              gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer)
              rect = canvas.getBoundingClientRect();
              x = event.clientX - rect.left;
              y = event.clientY - rect.top;
              t1 = vec2(2*x/canvas.width-1, 
                2*(canvas.height-y)/canvas.height-1);
              tCoords.push(t1);
            }
            else {
              
              numClick = 0;
              rect = canvas.getBoundingClientRect();
              x = event.clientX - rect.left;
              y = event.clientY - rect.top;
              t2 = vec2(2*x/canvas.width-1, 
                2*(canvas.height-y)/canvas.height-1);
              

              gl.bufferSubData(gl.ARRAY_BUFFER, 8*index, flatten(tCoords.pop() ));
              gl.bufferSubData(gl.ARRAY_BUFFER, 8*(index+1), flatten(tCoords.pop() ));
              gl.bufferSubData(gl.ARRAY_BUFFER, 8*(index+2), flatten(t2));
              gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer);
              shapes.push(3);
              index += 3;
              
              t = vec4(colors[cIndex]);

              gl.bufferSubData(gl.ARRAY_BUFFER, 16*(index-3), flatten(t));
              gl.bufferSubData(gl.ARRAY_BUFFER, 16*(index-2), flatten(t));
              gl.bufferSubData(gl.ARRAY_BUFFER, 16*(index-1), flatten(t));
            }}
        
            if (type == 3) {
                gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer);
            
                if(numClick < 1) {
                    numClick += 1;
                    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer)
                    rect = canvas.getBoundingClientRect();
                    x = event.clientX - rect.left;
                    y = event.clientY - rect.top;
                    t1 = vec2(2*x/canvas.width-1,
                    2*(canvas.height-y)/canvas.height-1);   
                }
                else {
              
                numClick = 0;
                numAprox = 30;
              
                rect = canvas.getBoundingClientRect();
                x = event.clientX - rect.left;
                y = event.clientY - rect.top;
                t2 = vec2(2*x/canvas.width-1, 
                2*(canvas.height-y)/canvas.height-1);
                rad = Math.sqrt( (t2[0]-t1[0])*(t2[0]-t1[0]) + (t2[1]-t1[1])*(t2[1]-t1[1]) );

                for (var i=0; i <= numAprox; i++){
                cCoords.push( vec2(rad*Math.cos(i/numAprox*2*Math.PI)+t1[0], 
                rad*Math.sin(i/numAprox*2*Math.PI)+t1[1]) ); 
                }
                cCoords.push(t1); 
                numElem = cCoords.length;
                shapes.push(numElem);
                for (var i=0; i<numElem; i++) 
                gl.bufferSubData(gl.ARRAY_BUFFER, 8*(index+i), flatten(cCoords.pop() ));
                index += numElem; 

                gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer);
                t = vec4(colors[cIndex]);
                for (var i = numElem; i>0 ; i--)
                    gl.bufferSubData(gl.ARRAY_BUFFER, 16*(index-i), flatten(t));
            }
        }
        
    });

    render();
}

function render() {
    
    gl.clear( gl.COLOR_BUFFER_BIT );
    var j = 0;
    
    for(var i = 0; i<shapes.length; i++) {
        
        if (shapes[i] == 1)
            gl.drawArrays( gl.POINTS, j, 1 );
        if (shapes[i] == 3)
            gl.drawArrays( gl.TRIANGLE_STRIP, j, 3 );
        if (shapes[i] == 32)
            gl.drawArrays( gl.TRIANGLE_FAN, j, 32 );
        
        j = j + shapes[i];
    }
        
    window.requestAnimFrame(render);
}
