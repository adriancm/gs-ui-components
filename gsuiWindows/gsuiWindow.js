"use strict";

class gsuiWindow {
	constructor( parent, id ) {
		const root = gsuiWindow.template.cloneNode( true );

		this.id = id;
		this.parent = parent;
		this.rootElement = root;
		this._elWrap = this._getElem( "wrap" );
		this._elHandlers = this._getElem( "handlers" );
		this._show =
		this._minimized =
		this._maximized = false;
		this.zIndex = 0;
		this.onresize =
		this.onfocusin =
		this.onresizing = null;
		this.rect = Object.seal( { x: 0, y: 0, w: 32, h: 32 } );
		this._restoreRect = Object.seal( { x: 0, y: 0, w: 32, h: 32 } );
		this._mousemovePos = Object.seal( { x: 0, y: 0 } );
		this._mousedownPos = Object.seal( { x: 0, y: 0 } );
		this._mousedownHeadHeight = 0;
		this._wMin =
		this._hMin = 32;
		Object.seal( this );

		root.dataset.windowId = id;
		root.addEventListener( "focusin", parent._onfocusinWin.bind( parent, this ) );
		this._getElem( "icon" ).ondblclick = this.close.bind( this );
		this._getElem( "headBtns" ).onclick = this._onclickBtns.bind( this );
		this._getElem( "head" ).onmousedown = this._onmousedownHead.bind( this );
		this._getElem( "title" ).ondblclick =
		this._getElem( "headContent" ).ondblclick = this._ondblclickTitle.bind( this );
		this._elHandlers.onmousedown = this._onmousedownHandlers.bind( this );
		this._setZIndex( 0 );
		this.setTitle( id );
		this.setPosition( 0, 0 );
		this.setSize( 300, 150 );
	}

	open() { return this.openToggle( true ); }
	close() { return this.openToggle( false ); }
	openToggle( b ) {
		if ( b !== this._show ) {
			if ( b ) {
				this._show = true;
				this._setClass( "show", true );
				this.parent._open( this );
			} else if ( !this.onclose || this.onclose() !== false ) {
				this._show = false;
				this._setClass( "show", false );
				this.parent._close( this );
			}
		}
	}

	setIdAttr( id ) {
		this.rootElement.id = id;
	}
	setTitleIcon( icon ) {
		this._getElem( "icon" ).dataset.icon = icon;
	}
	empty() {
		const cnt = this._getElem( "content" ),
			headCnt = this._getElem( "headContent" );

		while ( cnt.lastChild ) {
			cnt.lastChild.remove();
		}
		while ( headCnt.lastChild ) {
			headCnt.lastChild.remove();
		}
	}
	append( ...args ) {
		this._getElem( "content" ).append( ...args );
	}
	headAppend( ...args ) {
		this._getElem( "headContent" ).append( ...args );
	}

	focus() {
		const root = this.rootElement;

		if ( !root.contains( document.activeElement ) ) {
			setTimeout( root.focus.bind( root ), 50 );
		}
	}
	maximize() {
		if ( !this._maximized ) {
			const st = this.rootElement.style;

			this._restoreRect.x = this.rect.x;
			this._restoreRect.y = this.rect.y;
			this._restoreRect.w = this.rect.w;
			if ( !this._minimized ) {
				this._restoreRect.h = this.rect.h;
			}
			st.top = st.left = st.right = st.bottom = st.width = st.height = "";
			this._setClass( "maximized", true );
			this._setClass( "minimized", false );
			this._maximized = true;
			this._minimized = false;
			this._callOnresize();
			this.focus();
			this.parent._winMaximized( this.id );
		}
	}
	minimize() {
		if ( !this._minimized ) {
			const rcRestore = this._restoreRect;

			if ( !this._maximized ) {
				Object.assign( rcRestore, this.rect );
			}
			this._setClass( "minimized", true );
			this._setClass( "maximized", false );
			this._minimized = true;
			this._maximized = false;
			this.setSize( rcRestore.w, this._getHeadHeight(), "nocallback" );
			this.setPosition( rcRestore.x, rcRestore.y );
			this.parent._winRestored( this.id );
		}
	}
	restore() {
		if ( this._minimized || this._maximized ) {
			const rcRestore = this._restoreRect;

			this.focus();
			this._setClass( "minimized", false );
			this._setClass( "maximized", false );
			this._minimized =
			this._maximized = false;
			this.setSize( rcRestore.w, rcRestore.h );
			this.setPosition( rcRestore.x, rcRestore.y );
			this.parent._winRestored( this.id );
		}
	}

	movable( b ) {
		this._setClass( "movable", b );
	}
	setTitle( t ) {
		this._getElem( "title" ).textContent = t;
	}
	setSize( w, h, nocb ) {
		this.rect.w = w;
		this.rect.h = h;
		this.rootElement.style.width = `${ w }px`;
		this.rootElement.style.height = `${ h }px`;
		if ( nocb !== "nocallback" ) {
			this._callOnresize();
		}
	}
	setMinSize( w, h ) {
		this._wMin = w;
		this._hMin = h;
	}
	setPosition( x, y ) {
		this.rect.x = x;
		this.rect.y = y;
		this.rootElement.style.left = `${ x }px`;
		this.rootElement.style.top = `${ y }px`;
	}

	// events:
	_onclickBtns( e ) {
		const act = e.target.dataset.icon;

		if ( act ) {
			this[ act ]();
		}
	}
	_ondblclickTitle( e ) {
		if ( e.target === e.currentTarget ) {
			this._maximized
				? this.restore()
				: this.maximize();
		}
	}
	_onmousedownHead( e ) {
		const clTar = e.target.classList,
			clicked =
				clTar.contains( "gsuiWindow-head" ) ||
				clTar.contains( "gsuiWindow-title" ) ||
				clTar.contains( "gsuiWindow-headContent" );

		if ( clicked ) {
			this._mousedownPos.x = e.clientX;
			this._mousedownPos.y = e.clientY;
			this._setClass( "dragging", true );
			this.parent._startMousemoving( "move",
				this._onmousemoveHead.bind( this ),
				this._onmouseupHead.bind( this ) );
		}
	}
	_onmousedownHandlers( e ) {
		const dir = e.target.dataset.dir;

		if ( dir ) {
			this._mousedownPos.x = e.clientX;
			this._mousedownPos.y = e.clientY;
			this._mousedownHeadHeight = this._getHeadHeight();
			this._setClass( "dragging", true );
			this.parent._startMousemoving( `${ dir }-resize`,
				this._onmousemoveHandler.bind( this, dir ),
				this._onmouseupHandler.bind( this, dir ) );
		}
	}
	_onmousemoveHead( e ) {
		const x = e.clientX - this._mousedownPos.x,
			y = e.clientY - this._mousedownPos.y;

		this._setCSSrelativeMove( this._elHandlers.style, x, y );
		if ( !this.parent._lowGraphics ) {
			this._setCSSrelativeMove( this._elWrap.style, x, y );
		}
	}
	_onmouseupHead( e ) {
		const { x, y } = this.rect,
			x_ = e.clientX - this._mousedownPos.x,
			y_ = e.clientY - this._mousedownPos.y;

		this._setClass( "dragging", false );
		this._resetCSSrelative( this._elWrap.style );
		this._resetCSSrelative( this._elHandlers.style );
		if ( x_ || y_ ) {
			this.setPosition( x + x_, y + y_ );
			this._restoreRect.x = this.rect.x;
			this._restoreRect.y = this.rect.y;
		}
	}
	_onmousemoveHandler( dir, e ) {
		const fnResize = this.onresizing,
			x = e.clientX - this._mousedownPos.x,
			y = e.clientY - this._mousedownPos.y;

		this._mousemovePos.x = x;
		this._mousemovePos.y = y;
		this._calcCSSrelativeResize( dir, this._mousemovePos );
		this._setCSSrelativeResize( this._elHandlers.style, dir, this._mousemovePos );
		if ( !this.parent._lowGraphics ) {
			this._setCSSrelativeResize( this._elWrap.style, dir, this._mousemovePos );
			if ( fnResize ) {
				const w = this.rect.w,
					h = this.rect.h - this._mousedownHeadHeight;

				switch ( dir ) {
					case "n":  fnResize( w,     h - y ); break;
					case "w":  fnResize( w - x, h     ); break;
					case "e":  fnResize( w + x, h     ); break;
					case "s":  fnResize( w,     h + y ); break;
					case "nw": fnResize( w - x, h - y ); break;
					case "ne": fnResize( w + x, h - y ); break;
					case "sw": fnResize( w - x, h + y ); break;
					case "se": fnResize( w + x, h + y ); break;
				}
			}
		}
	}
	_onmouseupHandler( dir, e ) {
		const { x, y, w, h } = this.rect,
			m = this._mousemovePos;

		this._setClass( "dragging", false );
		this._resetCSSrelative( this._elWrap.style );
		this._resetCSSrelative( this._elHandlers.style );
		if ( m.x || m.y ) {
			switch ( dir ) {
				case "e" : this.setSize( w + m.x, h       ); break;
				case "se": this.setSize( w + m.x, h + m.y ); break;
				case "s" : this.setSize( w,       h + m.y ); break;
				case "sw": this.setSize( w - m.x, h + m.y ); this.setPosition( x + m.x, y       ); break;
				case "w" : this.setSize( w - m.x, h       ); this.setPosition( x + m.x, y       ); break;
				case "nw": this.setSize( w - m.x, h - m.y ); this.setPosition( x + m.x, y + m.y ); break;
				case "n" : this.setSize( w,       h - m.y ); this.setPosition( x,       y + m.y ); break;
				case "ne": this.setSize( w + m.x, h - m.y ); this.setPosition( x,       y + m.y ); break;
			}
		}
	}

	// private:
	_getElem( c ) {
		return this.rootElement.querySelector( `.gsuiWindow-${ c }` );
	}
	_attachTo( parentElem ) {
		parentElem.append( this.rootElement );
	}
	_setClass( clazz, b ) {
		this.rootElement.classList.toggle( `gsuiWindow-${ clazz }`, b );
	}
	_setZIndex( z ) {
		this.zIndex =
		this.rootElement.style.zIndex = z;
	}
	_callOnresize() {
		if ( this.onresize ) {
			const bcr = this._getElem( "content" ).getBoundingClientRect();

			this.onresize( bcr.width, bcr.height );
		}
	}
	_getHeadHeight() {
		return this._getElem( "head" ).getBoundingClientRect().height;
	}
	_resetCSSrelative( st ) {
		st.top =
		st.left =
		st.right =
		st.bottom = 0;
	}
	_setCSSrelativeMove( st, x, y ) {
		st.top    = `${  y }px`;
		st.left   = `${  x }px`;
		st.right  = `${ -x }px`;
		st.bottom = `${ -y }px`;
	}
	_calcCSSrelativeResize( dir, p ) {
		const w = this.rect.w - this._wMin,
			h = this.rect.h - this._mousedownHeadHeight - this._hMin;

		switch ( dir ) {
			case "n" : if ( h - p.y < 0 ) { p.y =  h; } break;
			case "s" : if ( h + p.y < 0 ) { p.y = -h; } break;
			case "w" :                                  if ( w - p.x < 0 ) { p.x =  w; } break;
			case "e" :                                  if ( w + p.x < 0 ) { p.x = -w; } break;
			case "nw": if ( h - p.y < 0 ) { p.y =  h; } if ( w - p.x < 0 ) { p.x =  w; } break;
			case "ne": if ( h - p.y < 0 ) { p.y =  h; } if ( w + p.x < 0 ) { p.x = -w; } break;
			case "sw": if ( h + p.y < 0 ) { p.y = -h; } if ( w - p.x < 0 ) { p.x =  w; } break;
			case "se": if ( h + p.y < 0 ) { p.y = -h; } if ( w + p.x < 0 ) { p.x = -w; } break;
		}
	}
	_setCSSrelativeResize( st, dir, p ) {
		switch ( dir ) {
			case "n" : st.top    = `${  p.y }px`; break;
			case "s" : st.bottom = `${ -p.y }px`; break;
			case "w" : st.left   = `${  p.x }px`; break;
			case "e" : st.right  = `${ -p.x }px`; break;
			case "nw": st.left   = `${  p.x }px`; st.top    = `${  p.y }px`; break;
			case "ne": st.right  = `${ -p.x }px`; st.top    = `${  p.y }px`; break;
			case "sw": st.left   = `${  p.x }px`; st.bottom = `${ -p.y }px`; break;
			case "se": st.right  = `${ -p.x }px`; st.bottom = `${ -p.y }px`; break;
		}
	}
}

gsuiWindow.template = document.querySelector( "#gsuiWindow-template" );
gsuiWindow.template.remove();
gsuiWindow.template.removeAttribute( "id" );

Object.freeze( gsuiWindow );
