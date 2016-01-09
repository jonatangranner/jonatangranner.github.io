precision mediump float;

varying vec2 fTexCoord;
uniform sampler2D texMap;
uniform int isShadow;

void main() {
  gl_FragColor = texture2D(texMap, fTexCoord);
}
