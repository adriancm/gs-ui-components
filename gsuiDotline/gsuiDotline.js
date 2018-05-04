"use strict";

window.SVGURL = "http://www.w3.org/2000/svg";

function gsuiDotline() {
	var root = document.createElement( "div" ),
		svg = document.createElementNS( SVGURL, "svg" ),
		polyline = document.createElementNS( SVGURL, "polyline" );

	this._init();
	svg.append( polyline );
	svg.setAttribute( "preserveAspectRatio", "none" );
	root.append( svg );
	root.className = "gsuiDotline";
	root.oncontextmenu = _ => false;
	root.onmousedown = this._mousedown.bind( this );
	this.rootElement = root;
	this._elSVG = svg;
	this._elPoly = polyline;
	this._dots = [];
	this._dotsId = 0;
	this._nlDots = root.getElementsByClassName( "gsuiDotline-dot" );
	this._opt = {};
	this.options( {
		step: 1,
		minX: 0,
		minY: 0,
		maxX: 150,
		maxY: 100
	} );
	this.lineToEdges( 0 );
	this.dotsMoveMode( "free" );
}

gsuiDotline.prototype = {
	resize() {
		var bcr = this.getBCR();

		this._elSVG.setAttribute( "viewBox", "0 0 " +
			( this._svgW = bcr.width ) + " " +
			( this._svgH = bcr.height ) );
	},
	options( obj ) {
		var opt = this._opt;

		Object.assign( opt, obj );
		opt.width = opt.maxX - opt.minX;
		opt.height = opt.maxY - opt.minY;
	},
	dotsMoveMode( mode ) {
		this._dotsMoveMode = mode;
	},
	lineToEdges( val ) {
		this._lineToEdges = val;
		this._drawPolyline();
	},
	setDots( arr ) {
		var dots = this._nlDots;

		arr.forEach( ( [ x, y ], i ) => {
			if ( i < dots.length ) {
				this._updateDot( dots[ i ].dataset.dotsId, x, y );
			} else {
				this._createDot( x, y );
			}
			this._sortDots();
			this._drawPolyline();
		} );
	},
	getDots() {
		return this._dots;
	},
	getBCR() {
		return this._rootBCR = this.rootElement.getBoundingClientRect();
	},

	// private:
	_init() {
		if ( !gsuiDotline._ready ) {
			gsuiDotline._ready = true;
			document.addEventListener( "mousemove", e => {
				gsuiDotline.focused && gsuiDotline.focused._mousemoveDot( e );
			} );
			document.addEventListener( "mouseup", _ => {
				gsuiDotline.focused && gsuiDotline.focused._mouseupDot();
			} );
		}
	},
	_sortDots() {
		this._dots.sort( ( a, b ) => a.x < b.x ? -1 : a.x > b.x ? 1 : 0 );
	},
	_computeValue() {
		return this._dots.map( d => d.x + " " + d.y ).join( "," );
	},
	_drawPolyline() {
		var dots = this._dots,
			svgW = this._svgW,
			svgH = this._svgH,
			arr = [],
			lineEdgeVal = this._lineToEdges,
			lineToEdges = Number.isFinite( lineEdgeVal ),
			{
				width,
				height,
				minX,
				minY
			} = this._opt;

		if ( lineToEdges ) {
			lineEdgeVal = svgH - ( lineEdgeVal - minY ) / height * svgH;
			arr.push( 0, lineEdgeVal );
		}
		dots.forEach( ( { x, y } ) => {
			arr.push(
				( x - minX ) / width * svgW,
				svgH - ( y - minY ) / height * svgH );
		} );
		if ( lineToEdges ) {
			arr.push( svgW, lineEdgeVal );
		}
		this._elPoly.setAttribute( "points", arr.join( " " ) );
	},
	_createDot( x, y ) {
		var element = document.createElement( "div" ),
			id = "i" + ( this._dotsId++ ),
			dot = { id, element,
				_saveX: x,
				_saveY: y
			};

		this._dots.push( dot );
		this._dots[ id ] = dot;
		element.className = "gsuiDotline-dot";
		element.dataset.dotsId = id;
		element.onmousedown = this._mousedownDot.bind( this, id );
		this._updateDot( id, x, y );
		this.rootElement.append( element );
		return id;
	},
	_updateDot( dotId, x, y ) {
		var bcr = this._rootBCR,
			opt = this._opt,
			dot = this._dots[ dotId ],
			dotStyle = dot.element.style;

		x = Math.max( opt.minX, Math.min( x, opt.maxX ) );
		y = Math.max( opt.minY, Math.min( y, opt.maxY ) );
		dot.x = +( Math.round( x / opt.step ) * opt.step ).toFixed( 5 );
		dot.y = +( Math.round( y / opt.step ) * opt.step ).toFixed( 5 );
		dotStyle.left = ( dot.x - opt.minX ) / opt.width * 100 + "%";
		dotStyle.top = 100 - ( ( dot.y - opt.minY ) / opt.height * 100 ) + "%";
	},
	_deleteDot( dotId ) {
		var dots = this._dots;

		dots[ dotId ].element.remove();
		dots.splice( dots.findIndex( dot => dot.id === dotId ), 1 );
		delete dots[ dotId ];
		this._drawPolyline();
	},
	_selectDot( dotId, b ) {
		var dot = this._dots[ dotId ];

		if ( b ) {
			gsuiDotline.focused = this;
			this._activeDot = dot;
			this._activeDotX = dot.x;
			this._activeDotY = dot.y;
		} else {
			delete gsuiDotline.focused;
		}
		dot.element.classList.toggle( "gsuiDotline-dotSelected", b );
		this._locked = b;
		this._dotInd = this._dots.findIndex( d => d.id === dotId );
	},
	_updateValue( isInputOrBoth ) {
		var val = this._computeValue();

		if (
			isInputOrBoth === 2 ||
			( isInputOrBoth && val !== this._prevValueInput ) ||
			( !isInputOrBoth && val !== this._prevValue )
		) {
			this.value = val;
			if ( isInputOrBoth ) {
				this._prevValueInput = val;
				this.oninput && this.oninput( val );
			}
			if ( !isInputOrBoth || isInputOrBoth === 2 ) {
				this._prevValue = val;
				this.onchange && this.onchange( val );
			}
		}
	},

	// events:
	_mousedown( e ) {
		if ( e.button === 0 ) {
			if ( e.target === this._elSVG ) {
				var opt = this._opt,
					bcr = this.getBCR(),
					h = opt.height,
					dotId = this._createDot(
						( e.pageX - bcr.left ) / bcr.width * opt.width + opt.minX,
						h - ( e.pageY - bcr.top ) / bcr.height * h + opt.minY
					);

				this._sortDots();
				this._drawPolyline();
				this._selectDot( dotId, true );
				this._updateValue( 1 );
			}
			this._activeDot
			this._pageX = e.pageX;
			this._pageY = e.pageY;
			this._dotMaxY = -Infinity;
			this._dotMinY = Infinity;
			this._dots.forEach( ( d, i ) => {
				if ( i >= this._dotInd ) {
					this._dotMaxY = Math.max( d.y, this._dotMaxY );
					this._dotMinY = Math.min( d.y, this._dotMinY );
				}
			} );
		}
	},
	_mousedownDot( dotId, e ) {
		if ( e.button === 2 ) {
			this._deleteDot( dotId );
			this._updateValue( 2 );
		} else if ( e.button === 0 ) {
			this.getBCR();
			this._prevValueInput =
			this._prevValue = this.value;
			this._selectDot( dotId, true );
		}
	},
	_mouseupDot() {
		if ( this._locked ) {
			var fn = function( d ) {
					d._saveX = d.x;
					d._saveY = d.y;
				};

			this._selectDot( this._activeDot.id, false );
			this._dotsMoveMode === "free"
				? fn( this._activeDot )
				: this._dots.forEach( fn );
			this._updateValue();
		}
	},
	_mousemoveDot( e ) {
		if ( this._locked ) {
			var dots = this._dots,
				dot = this._activeDot,
				dotX = this._activeDotX,
				dotY = this._activeDotY,
				dotInd = this._dotInd,
				bcr = this._rootBCR,
				opt = this._opt,
				incX = opt.width / bcr.width * ( e.pageX - this._pageX ),
				incY = opt.height / bcr.height * -( e.pageY - this._pageY );

			switch ( this._dotsMoveMode ) {
				case "free":
					this._updateDot( dot.id, dotX + incX, dotY + incY );
					this._sortDots();
					break;
				case "linked":
					if ( incY ) {
						incY = incY < 0
							? Math.max( incY, opt.minY - this._dotMinY )
							: Math.min( incY, opt.maxY - this._dotMaxY );
					}
					if ( incX ) {
						incX = incX < 0
							? Math.max( incX, ( dotInd ? dots[ dotInd - 1 ]._saveX : opt.minX ) - dot._saveX )
							: Math.min( incX, opt.maxX - dots[ dots.length - 1 ]._saveX );
					}
					while ( dot = dots[ dotInd++ ] ) {
						this._updateDot( dot.id, dot._saveX + incX, dot._saveY + incY );
					}
					break;
			}
			this._drawPolyline();
			this._updateValue( 1 );
		}
	}
};