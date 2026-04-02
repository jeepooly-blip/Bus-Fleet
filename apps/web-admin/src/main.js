console.log('Main.js is executing');
const rootElement = document.getElementById('root');
if (rootElement) {
  rootElement.innerHTML += '<div style="padding: 20px; background: #fee; border: 1px solid #fcc;">Main.js is working</div>';
}
