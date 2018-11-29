// Vendor
import Component from '@ember/component';
import {task, timeout} from 'ember-concurrency';
import $ from 'jquery';

/* global panzoom */

// Constants
const PANZOOM_EVENT_DEBOUNCE = 50;
const PANZOOM_ZOOM_SPEED = 0.05;

export default class PanzoomContainer extends Component {
  onPanzoom = () => {};
  onPanzoomInitialize = () => {};
  minZoom = 1;
  maxZoom = 1;
  zoomSpeed = PANZOOM_ZOOM_SPEED;
  bounds = true;
  autocenter = false;
  smoothScroll = false;

  triggerPanzoomEventTask = task(function*() {
    this.onPanzoom(this._getPanzoomState());
    yield timeout(PANZOOM_EVENT_DEBOUNCE);
    this.onPanzoom(this._getPanzoomState());
  }).restartable();

  didInsertElement() {
    const $container = this.$();
    const panzoomRef = panzoom(
      $container[0],
      this.getProperties('minZoom', 'maxZoom', 'zoomSpeed', 'bounds', 'smoothScroll', 'autocenter')
    );

    $container.on('pan panstart panend zoom', () => {
      this.get('triggerPanzoomEventTask').perform();

      // Make sure we hide active popover to avoid having them floating around
      $('[data-toggle="popover"]').popover('hide');
    });

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
