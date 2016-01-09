precision mediump float;

uniform sampler2D shadowMap;
uniform   float u_ka, u_kd, u_ks, u_alpha;
varying   vec3  matrialColor, pos, normal, light;
varying   vec4 positionFromLight;

const float u_L = 1.0;
const vec3 lightColor = vec3(1.0, 1.0, 1.0);

// http://stackoverflow.com/questions/18453302/how-do-you-pack-one-32bit-int-into-4-8bit-ints-in-glsl-webgl
const vec4 bitSh = vec4(256. * 256. * 256., 256. * 256., 256., 1.);
const vec4 bitShifts = vec4(1.) / bitSh;

float unpack (vec4 color) {
    return dot(color, bitShifts);
}

void main() {
  vec3 E = normalize(pos); // eye vector
  vec3 N = normalize(normal); // normal vector
  vec3 L = normalize(light);

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

  // Is in shadow
  vec3 shadowCoord = (positionFromLight.xyz / positionFromLight.w) * 0.5 + 0.5;
  vec4 rgbaDepth = texture2D(shadowMap, shadowCoord.xy);
  float depth = unpack(rgbaDepth);
  float visibility = (shadowCoord.z > depth + 0.0005) ? 0.3 : 1.0;

  // Set color
  gl_FragColor = vec4(color.rgb * visibility, color.a);
}
