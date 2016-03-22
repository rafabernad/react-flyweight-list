import React from 'react';
import shallowCompare from 'react-addons-shallow-compare';

var FlyweightItem = (FlyweightItemContent) => {

	return class FlyweightItem extends FlyweightItemContent {
		constructor(props) {
			super(props)
			this.state = props;
		}
		shouldComponentUpdate(nextProps, nextState) {
			return shallowCompare(this, nextProps, nextState);
		}
		/*render() {
			return (
				<FlyweightItemContent {...this.state} className={this.state.className + ' flyweight-item trololo'}/>
			);
		}*/
	};
}

export default FlyweightItem;