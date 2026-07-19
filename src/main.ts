import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap';
import './app.css';
import App from './App.svelte';
import { mount } from 'svelte';

const DOMTarget = document.getElementById('app');
if(!DOMTarget) {
  throw new Error('DOM target not found. Make sure there is an element with id "app" in your HTML.');
}

mount(App, { target: DOMTarget });
