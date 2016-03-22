import React from 'react';
import ReactDOM from 'react-dom';
import DOMUtils from './dom-utils';
import _FlyweightItem from './flyweight-item';
import shallowCompareIgnore from './shallow-compare-ignore';

var FlyweightList = FlyweightItemConstructor => {

	var FlyweightItem = _FlyweightItem(FlyweightItemConstructor);

	var FlyweightList = class extends React.Component {
		constructor(props) {
			super(props);
			this.state = {
				clientWidth: 0,
				clientHeight: 0,
				scrollLeft: 0,
				scrollTop: 0,
				items: props.items
			};
			this.viewport = null;
			this.container = null;
			this.items = [];
			this.index = 0;
		}
		componentDidMount() {
			this.updateNodeReferences();
			this.resized();
			window.addEventListener('resize', this.resized.bind(this));
		}
		componentWillUnmount() {
			window.removeEventListener('resize', this.resized.bind(this));
		}
		componentDidUpdate(prevProps, prevState) {
			this.updateNodeReferences();
			if (this.refresh()) {
				this.initializePositions();
			} else {
				this.forceUpdate();
			}
		}
		shouldComponentUpdate(nextProps, nextState) {
			var shouldRender = shallowCompareIgnore(this, nextProps, nextState, ['items', 'scrollLeft', 'scrollTop']);
			shouldRender = shouldRender || nextProps.items.length !== this.props.items.length ||
				// next items are less than the ones currently rendered?
				(nextProps.items.length < this.items.length ||
					// or next items are more than the ones currently rendered,...
					(nextProps.items.length > this.items.length &&
						// and rendered items doesn't fit the available space
						this.items.length !== this.calcNodeItemsCount()));

			//	recalculate items position only when needed & no re-render is necessary
			if (!shouldRender && this.shouldUpdateItems()) {
				this.items.length && this.updateItems();
			}
			return shouldRender;
		}

		/**
		 * Stores the viewport and scrollarea nodes, and creates an array of FlyweightItems from component's references
		 * @return {undefined}
		 */
		updateNodeReferences() {
			this.viewport = ReactDOM.findDOMNode(this);
			this.container = this.viewport.querySelector('.' + this.props.scrollContainerClassName);

			if (this.refs) {
				this.items.length = 0;
				for (var key in this.refs) {
					this.items[parseInt(key)] = this.refs[key];
				}
			}
		}

		/**
		 * Computes the bounds of all the rendered items
		 * @return {Object}	The items bounds
		 */
		getNodeItemsBounds() {
			var containerBounds = this.container.getBoundingClientRect();

			var bounds = {
				top: containerBounds.height,
				height: 0,
				left: 0,
				width: 0
			};

			for (var i = 0; i < this.items.length; i++) {
				var node = ReactDOM.findDOMNode(this.items[i]);
				var nodeBounds = node.getBoundingClientRect();
				//	adjust them relative to scroll area
				var relativeBounds = {
					top: nodeBounds.top - containerBounds.top,
					left: nodeBounds.left - containerBounds.left,
					height: nodeBounds.height,
					width: nodeBounds.width
				};

				if (relativeBounds.top < bounds.top) {
					bounds.top = relativeBounds.top;
				}
				if (relativeBounds.left < bounds.left || bounds.left === 0) {
					bounds.left = nodeBounds.left;
				}

				bounds.width = relativeBounds.left + relativeBounds.width > bounds.width ? relativeBounds.left + relativeBounds.width : bounds.width;
				bounds.height = bounds.height + relativeBounds.height;
			}

			return bounds;
		}

		/**
		 * Initializes item nodes positions
		 * @return {undefined}
		 */
		initializePositions() {
			for (var i = 0; i < this.items.length; i++) {
				var nodeItem = this.items[i];
				this.updateItem(nodeItem, true);
			}
		}

		/**
		 * Checks if items bounds are visible
		 * @return {Boolean} True if container area contains items
		 */
		shouldUpdateItems(nextProps, nextState) {
			return this.getOutOfBoundsItemsCount() !== 0;
		}

		/**
		 * Updates items states and positions
		 * @return {Boolean} True if any item has been updated
		 */
		updateItems() {

			var fIndex = this.getOutOfBoundsItemsCount();
			do {
				var forward = fIndex > 0;
				for (var i = 0; i < Math.abs(fIndex); i++) {
					var itemComponent, item, itemIndex, update = false;
					if (forward) {
						itemIndex = this.pageSize + this.index;
						if (itemIndex < this.props.items.length) {
							itemComponent = this.items.shift();
							item = this.props.items[itemIndex];
							this.items.push(itemComponent);
							this.updateItem(itemComponent, forward);
							itemComponent.setState(item);
							this.index++;
						}
					} else {
						itemIndex = this.index - 1;
						if (itemIndex >= 0) {
							itemComponent = this.items.pop();
							item = this.props.items[itemIndex];
							this.items.unshift(itemComponent);
							this.updateItem(itemComponent, forward);
							itemComponent.setState(item);
							this.index--;
						}
					}
				}
				fIndex = this.getOutOfBoundsItemsCount();
			}
			while (fIndex !== 0);
			return true;
		}

		/**
		 * Calculates the number of items that are out of scroll bounds, and the position of the items
		 * negative values for items out of bounds at the bottom of the list; otherwise at the top.
		 * @return {integer} The number of items out of bounds, and their position
		 */
		getOutOfBoundsItemsCount() {
			var bounds = this.getNodeItemsBounds();
			var nodeItemHeight = this.calcAverageItemHeight();
			var count = nodeItemHeight ? Math.floor((this.viewport.scrollTop - bounds.top) / nodeItemHeight) - Math.floor(this.items.length / 3) : 0;
			if (this.index === 0 && count < 0) {
				count = 0;
			} else if (this.index + this.pageSize >= this.props.items.length && count > 0) {
				count = 0;
			}
			return count;
		}

		/**
		 * Updates an item position
		 * @return {undefined}
		 */
		updateItem(node, forward = true) {
			var referenceNode = ReactDOM.findDOMNode(this.items[(this.items.indexOf(node) + (forward ? -1 : +1))]);
			var containerBounds = this.container.getBoundingClientRect();
			var containerTop = containerBounds.top;
			var node = ReactDOM.findDOMNode(node);
			var translateY = 0;
			if (referenceNode) {
				var referenceNodeBounds = referenceNode.getBoundingClientRect();
				var posX = referenceNodeBounds.top - containerTop;
				translateY = posX + (forward ? referenceNode.clientHeight : -node.clientHeight);
			}
			if (translateY <= containerBounds.height - node.clientHeight) {
				node.style.transform = `translate3d(0,${translateY}px,0)`;
			}
			return true;
		}

		/**
		 * Calculates the average height of rendered items
		 * @return {Integer} The average height of all the rendered items
		 */
		calcAverageItemHeight() {

			if (!isNaN(this.props.sameHeight)) {
				return this.props.sameHeigt;
			} else if (this.props.sameHeight !== false) {
				var value = 0;
				if (this.items && this.items.length) {
					return this.items.reduce((value, item) => {
						if (!item) return value;
						if (value) {
							return (value + (ReactDOM.findDOMNode(item)).clientHeight) / 2;
						} else {
							return (ReactDOM.findDOMNode(item)).clientHeight;
						}
					}, 0);
				}
				return value;
			}
		}

		/**
		 * Calculates the scroll area height
		 * @return {integer} the height, in pixels
		 */
		calcContainerHeight() {
			return (this.props.itemHeight ? this.props.itemHeight : this.calcAverageItemHeight()) * this.props.items.length;
		}

		/**
		 * Calculates the # of items to be rendered, or fallbacks to 20 items.
		 * Required to get the items heights. If data items count is lower than this figure,
		 * returns data item's count.
		 * @return {Integer} The number of items to be rendered.
		 */
		calcNodeItemsCount() {
			return Math.min((this.viewport ? (Math.floor(this.viewport.clientHeight / this.calcAverageItemHeight()) * 3) : 20), this.props.items.length);
		}

		/**
		 * Scroll handler; forces update of item's positions
		 * @return {undefined}
		 */
		scrolled() {

			DOMUtils.requestAnimationFrame(function() {
				this.updateItems();
				this.setState({
					scrollTop: this.viewport.scrollTop,
					scrollLeft: this.viewport.scrollLeft
				});
			}.bind(this))


		}
		resized() {
			this.refresh();
			this.setState({
				clientWidth: this.viewport.clientWidth,
				clientHeight: this.viewport.clientHeight
			});

		}

		/**
		 * Updates metrics based on viewport dimensions; returns false if re-render is required
		 * @return {boolean}
		 */
		refresh() {
			//	Update the scroll area
			this.container.style.height = this.calcContainerHeight() + 'px';
			//	If averageItemHeight = 0 then we're initializing; reset to previous value;
			var averageItemHeight = this.calcAverageItemHeight();
			this.index = averageItemHeight !== 0 ? Math.floor((this.viewport ? this.viewport.scrollTop : 0) / averageItemHeight) : this.index;
			var pageSize = this.calcNodeItemsCount();
			if (pageSize !== this.pageSize) {
				this.pageSize = pageSize;
				return false;
			}
			return true;
		}

		render() {
			var nodeIndex = 0;
			if (!this.pageSize) {
				this.pageSize = 1;
			}
			return (
				<div className="flyweight-list" onScroll={this.scrolled.bind(this)}>
					<div className={this.props.scrollContainerClassName}>
						{
							this.props.items.slice(this.index, this.index + this.pageSize).map((item, index) => {
								var component = <FlyweightItem ref={nodeIndex.toString()} {...item} key={index} className={this.props.itemClassName}/>
								nodeIndex++;
								return component;
							})
						}
					</div>
				</div>
			);
		}
	}

	//	Default properties for the list
	FlyweightList.defaultProps = {
		scrollContainerClassName: 'scroll-viewport',
		itemClassName: 'flyweight-item',
		items: []
	};

	return FlyweightList;
}


export var FlyweightItem = _FlyweightItem;
export default FlyweightList;