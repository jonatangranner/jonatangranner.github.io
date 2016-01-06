precision mediump float;

varying vec2 fTexCoord;
uniform sampler2D texMap;

void main() {
  gl_FragColor = texture2D(texMap, fTexCoord);
}
