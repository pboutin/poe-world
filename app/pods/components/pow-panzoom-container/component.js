// Vendor
import Component from '@ember/component';
import {task, timeout} from 'ember-concurrency';
import {argument} from '@ember-decorators/argument';
import {type, optional} from '@ember-decorators/argument/type';

/* global panzoom */

// Constants
const PANZOOM_EVENT_DEBOUNCE = 50;
const PANZOOM_ZOOM_SPEED = 0.05;

export default class PanzoomContainer extends Component {
  @argument
  @type(Function)
  onPanzoom = () => {};

  @argument
  @type(Function)
  onPanzoomInitialize = () => {};

  @argument
  @type(optional('number'))
  minZoom = 1;

  @argument
  @type(optional('number'))
  maxZoom = 1;

  @argument
  @type(optional('number'))
  zoomSpeed = PANZOOM_ZOOM_SPEED;

  bounds = true;
  autocenter = false;
  smoothScroll = false;

  triggerPanzoomEventTask = task(function*() {
    this.onPanzoom(this._getPanzoomState());
    yield timeout(PANZOOM_EVENT_DEBOUNCE);
    this.onPanzoom(this._getPanzoomState());
  }).drop();

  didInsertElement() {
    const $container = this.$();
    const panzoomRef = panzoom(
      $container[0],
      this.getProperties('minZoom', 'maxZoom', 'zoomSpeed', 'bounds', 'smoothScroll', 'autocenter')
    );

    ['pan', 'zoom'].forEach(event =>
      panzoomRef.on(event, () => {
        this.get('triggerPanzoomEventTask').perform();
      })
    );

    this._panzoomRef = panzoomRef;
    this.onPanzoomInitialize(panzoomRef);
  }

  _getPanzoomState() {
    const {x, y, scale} = this._panzoomRef.getTransform();

    return {
      zoom: scale,
      panTop: y,
      panLeft: x
    };
  }
}
