import React from "react";
import ReactDOM from "react-dom";
import ReactCSSTransitionGroup from "react-addons-css-transition-group";
import _ from "lodash";
import classnames from "classnames";
import LayeredComponent from "./LayeredComponent";

export default class Popeye extends LayeredComponent {
  constructor(props) {
    super(props);
    this.renderLayer = this.renderLayer.bind(this);
    this.getAnchorPoint = this.getAnchorPoint.bind(this);
    this.handleBodyClick = this.handleBodyClick.bind(this);
    this.clickHandler = this.clickHandler.bind(this);
    this.getTransformOrigin = this.getTransformOrigin.bind(this);
    this.componentDidUpdate = this.componentDidUpdate.bind(this);
    this.componentWillUnmount = this.componentWillUnmount.bind(this);

    this.state = {
      isPropagationStopped: false,
      currentAnchorPos: {x: 0, y: 0}
    };
  }
  componentDidMount() {
    this.setState({currentAnchorPos: this.getAnchorPoint()});
    super.init();
  }
  componentWillUnmount() {
    super.componentWillUnmount();
    this.props.onToggle(false);
    document.removeEventListener("click", this.handleBodyClick);
    window.removeEventListener("mousewheel", this.scrollHandler);
  }
  componentDidUpdate(prevProps, prevState) {
    super.componentDidUpdate(prevProps, prevState);

    if (this.props.opened !== prevProps.opened) {
      this.setState({currentAnchorPos: this.getAnchorPoint()})
    }
    // not sure about this
    if ((typeof document !== "undefined") && this.props.opened && !prevProps.opened) {
      document.addEventListener("click", this.handleBodyClick);
      window.addEventListener("mousewheel", this.scrollHandler);
    } else if (!this.props.opened && prevProps.opened) {
      document.removeEventListener("click", this.handleBodyClick);
      window.removeEventListener("mousewheel", this.scrollHandler);
    }
  }
  scrollHandler(event) {
    console.log("scrolling");
  }
  dirToAxis(key) {
    return {"left": "x", "right": "x", "top": "y", "bottom": "y"}[key];
  }
  oppositeDir(key) {
    return {"left": "right", "right": "left", "top": "bottom", "bottom": "top"}[key];
  }
  getAnchorPoint() {
    if (typeof document != "undefined") {
      const anchor = this.props.anchor || ReactDOM.findDOMNode(this).parentNode;
      const pos = anchor.getBoundingClientRect();
      const anchorOffset = _.isFunction(this.props.anchorOffset)
        ? this.props.anchorOffset(anchor, ReactDOM.findDOMNode(this))
        : this.props.anchorOffset;


      const point = _.chain(_.pick(pos, _.keys(anchorOffset)))
        .mapValues((value, key) => {
          const scrollProp = (this.dirToAxis(key) === "x") ? "scrollLeft" : "scrollTop";
          return value + document.body[scrollProp] + (anchorOffset[key] * ((key === "right" || key === "bottom") ? -1 : 1));
        })
        .mapKeys((value, key) => this.dirToAxis(key))
        .value()

      return _.chain(this.props.popOffset)
        .mapValues((value, key) => {
          const pos = point[this.dirToAxis(key)];
          if (key === "right") {
            return document.body.offsetWidth - pos;
          } else if (key === "bottom") {
            return document.body.offsetHeight - pos;
          } else {
            return pos;
          }
        })
        .mapKeys((value, key) => this.dirToAxis(key))
        .value();

    } else {
      return {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0
      }
    }
  }
  handleBodyClick() {
    this.props.onToggle(false); // intent is to close
  }
  clickHandler(e) {
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
  }
  getTransformOrigin() { 
    let originObj = _.chain(this.props.popOffset)
      .mapValues((value, key) => {
        if (key === "top" || key === "left") {
          return value + "px"
        } else if (key === "right" || key === "bottom") {
          return `calc(100% - ${value}px)`
        }
      })
      .mapKeys((value, key) => this.dirToAxis(key))
      .value();
    return ["x", "y"].map((axis) => originObj[axis]).join(" ");
  }
  renderLayer() {
    const transformOrigin = this.getTransformOrigin();
    const styleObject = _.mapValues(this.props.popOffset, 
      (value, key) => this.state.currentAnchorPos[this.dirToAxis(key)] - value);

    let childElement = React.Children.only(this.props.children);
    let mergedStyles = _.assign(_.clone(childElement.props.style || {}), {
      "transformOrigin": transformOrigin,
      "WebkitTransformOrigin": transformOrigin
    });
    let child = React.cloneElement(childElement, _.assign(_.clone(childElement.props), {style: mergedStyles}));

    return (
      <ReactCSSTransitionGroup 
        component={ this.props.component }
        style={ styleObject } 
        onClick={ this.clickHandler } 
        className={ classnames("PopeyeElement", this.props.className) }
        transitionName="PopeyeTransition"
        transitionEnterTimeout={300}
        transitionLeaveTimeout={300}
        transitionEnter={ this.props.transitionEnabled }
        transitionLeave={ this.props.transitionEnabled }>
        { this.props.opened && child }
      </ReactCSSTransitionGroup>
    )
  }
  render() {
    return <div className="Popeye" />
  }

  static toggleHandler(context, popeyeName) {
    return (value) => context.setState({[popeyeName]: isFinite(value) ? value : !context.state[popeyeName]});
  }
}

Popeye.defaultProps = {
  component: "div",
  opened: false,
  anchorOffset: {"left": 0, "bottom": 0},
  popOffset: {"left": 0, "top": 0},
  transitionEnabled: true
}
Popeye.propTypes = {
  component: React.PropTypes.string,
  className: React.PropTypes.string,
  opened: React.PropTypes.bool,
  onToggle: React.PropTypes.func,
  anchor: React.PropTypes.object, // domNode
  anchorOffset: React.PropTypes.oneOfType([
    React.PropTypes.object,
    React.PropTypes.func
  ]),
  popOffset: React.PropTypes.oneOfType([
    React.PropTypes.object,
    React.PropTypes.func
  ]),
  transitionEnabled: React.PropTypes.bool
}
