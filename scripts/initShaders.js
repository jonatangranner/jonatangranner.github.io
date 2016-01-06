
    // Get a file as a string using  AJAX
    function loadFileAJAX(name) {
        var xhr = new XMLHttpRequest(),
            okStatus = document.location.protocol === "file:" ? 0 : 200;
        xhr.open('GET', name, false);
        xhr.send(null);

        if (xhr.status !== 200) throw new Error('Bad XHR request');
        return xhr.responseText;
    };


    function initShaders(gl, vShaderName, fShaderName) {
        function getShader(gl, shaderName, type) {
            var shader = gl.createShader(type),
                shaderScript = loadFileAJAX(shaderName);
            if (!shaderScript) {
                throw new Error("Could not find shader source: " + shaderName);
            }
            gl.shaderSource(shader, shaderScript);
            gl.compileShader(shader);

            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
              var typeName = type === gl.VERTEX_SHADER ? 'vetex' : 'fragment';
              throw new Error('Compile error in ' + shaderName + ':\n' + gl.getShaderInfoLog(shader));
            }
            return shader;
        }
        var vertexShader = getShader(gl, vShaderName, gl.VERTEX_SHADER),
            fragmentShader = getShader(gl, fShaderName, gl.FRAGMENT_SHADER),
            program = gl.createProgram();

        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            throw new Error("Could not initialise shaders");
        }

        return program;
    };
