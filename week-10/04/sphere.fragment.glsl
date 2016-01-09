precision mediump float;

uniform samplerCube envMap;
uniform sampler2D bumpMap;
varying   vec3 normalWorld, posWorld;
uniform   vec3 eye;
uniform   mat4 uM, uV, uP;

uniform   float u_ka, u_kd, u_ks, u_alpha;
varying   vec3  posView, lightView;

const float u_L = 1.0;
const vec3 lightColor = vec3(1.0, 1.0, 1.0);

const float PI = 3.14159265358979323846264;

float atan2(float y, float x) {
  return 2.0 * atan(length(vec2(x, y)) - x, y);
}

vec3 rotate_to_normal(vec3 normal, vec3 v) {
  float a = 1.0/(1.0 + normal.z);
  float b = -normal.x * normal.y * a;
  return vec3(1.0 - normal.x*normal.x*a, b, -normal.x) * v.x +
         vec3(b, 1.0 - normal.y*normal.y*a, -normal.y) * v.y +
         normal * v.z;
}

void main() {
  vec3 Nw = normalize(normalWorld);

  // Bump map
  float phi = -1.0 * acos(Nw.y);
  float sin_phi = sin(phi);

  float xm = Nw.x / sin_phi;
  float ym = Nw.z / sin_phi;

  float theta = atan2(ym, xm);

  vec2 bumpCoord = vec2(theta / (2.0 * PI), phi / PI);
  vec3 bumpValue = (texture2D(bumpMap, bumpCoord).rgb - 0.5) * 2.0;

  vec3 normal = rotate_to_normal(Nw, bumpValue);
  vec3 normalView = (uV * uM * vec4(normal, 0)).xyz;

  // Reflection
  vec3 R = reflect(posWorld - eye, normal);
  vec3 matrialColor = textureCube(envMap, R).rgb;

  // Light
  vec3 E = normalize(posView); // eye vector
  vec3 N = normalize(normalView); // normal vector
  vec3 L = normalize(lightView);

  vec3 H = normalize(L + E);

  // Calculate angles
  float cos_theta = dot(L, N);
  float cos_psi = dot(N, H);

  // Calculate light products
  vec3 ambientProduct = (u_ka * matrialColor) * (u_L * lightColor);
  vec3 diffuseProduct = (u_kd * matrialColor) * (u_L * lightColor);
  vec3 specularProduct = (u_ks * matrialColor) * (u_L * lightColor);

  // Calculate light results
  vec3 ambient = ambientProduct;
  vec3 diffuse = max(cos_theta, 0.0) * diffuseProduct;
  vec3 specular = pow(max(cos_psi, 0.0), u_alpha) * specularProduct;
  if (cos_theta < 0.0) {
    specular = vec3(0.0, 0.0, 0.0);
  }

  // Sum up light contributions
  vec4 color = vec4(ambient + diffuse + specular, 1.0);

  // Set color
  gl_FragColor = vec4(color.rgb, color.a);
}
