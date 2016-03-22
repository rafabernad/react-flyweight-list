import shallowCompare from 'react-addons-shallow-compare';

/**
 * Does a shallow comparison for props and state, ignoring fields.
 * See ReactComponentWithPureRenderMixin
 */
export default function shallowCompareIgnore(instance, nextProps, nextState, ignores) {

  var instanceValues = {
    state: Object.create(instance.state),
    props: Object.create(instance.props)
  };
  var nProps = Object.create(nextProps);
  var nState = Object.create(nextState);

  for (var i = 0; i < ignores.length; i++) {
    delete instanceValues.props[ignores[i]];
    delete instanceValues.state[ignores[i]];
    delete nProps[ignores[i]];
    delete nState[ignores[i]];
  }
  
  return shallowCompare(instanceValues, nProps, nState);
}