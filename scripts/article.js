/*eslint-env es6, browser */
(function () {
  'use strict';

  document.addEventListener("DOMContentLoaded", function() {
    window.renderMathInElement(document.body, {
      delimiters: [
        {left: "$$", right: "$$", display: true},
        {left: "$", right: "$", display: false}
      ]
    });

    Array.prototype.slice.call(document.querySelectorAll('pre code')).forEach(function (node) {
      const lines = node.innerText.split('\n').slice(1, -1);
      const leading = lines[0].length - lines[0].trim().length;
      node.innerText = lines.map(function (line) {
        return line.slice(leading);
      }).join('\n');

      window.hljs.highlightBlock(node);
    });
  });
})();
