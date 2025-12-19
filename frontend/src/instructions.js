import './instructions.css'
import InstructionsView from './InstructionsView.svelte'
import { mount } from 'svelte'

const app = mount(InstructionsView, {
  target: document.getElementById('instructions')
})

export default app

