var SoloSlide = (function ()
{
	var _ViewCenter = [0.0, 2000.0];
	var _Scale = 0.2;
	var _ScreenScale = 1.0;

	var _ScreenMouse = vec2.create();
	var _WorldMouse = vec2.create();

	function SoloSlide(canvas)
	{
		this._Graphics = new Graphics(canvas);
		this._LastAdvanceTime = Date.now();
		this._ViewTransform = mat2d.create();
		this._AnimationInstance = null;
		this._SlideAnimation = null;
		this._SoloSkaterAnimation = null;

		var _This = this;

		_ScheduleAdvance(_This);
		_Advance(_This);

		document.addEventListener("keydown", function(ev)
		{
			// 68 D
			// 65 A
			// 39 right
			// 37 left
			switch(ev.keyCode)
			{
				case 32: // Enter
					break;
				case 16: // Shift
					break;
				case 68: // 'D'
				case 39: // right
					break;	
				case 65: // 'A'
				case 37: // left
					break;	
				case 87: 
				case 38:
					break;

			}
		});

	}

	function _Advance(_This)
	{
		_This.setSize(window.innerWidth, window.innerHeight);

		var now = Date.now();
		var elapsed = (now - _This._LastAdvanceTime)/1000.0;
		_This._LastAdvanceTime = now;

		var actor = _This._ActorInstance;

		if(_This._AnimationInstance)
		{
			var ai = _This._AnimationInstance;
			ai.apply(ai._Time + elapsed, _This._ActorInstance);
		}

		if(actor)
		{
			var graphics = _This._Graphics;
		
			var w = graphics.viewportWidth;
			var h = graphics.viewportHeight;


			var vt = _This._ViewTransform;
			vt[0] = _Scale;
			vt[3] = _Scale;
			vt[4] = (-_ViewCenter[0] * _Scale + w/2);
			vt[5] = (-_ViewCenter[1] * _Scale + h/2);

			actor.advance(elapsed);
		}

		_Draw(_This, _This._Graphics);
		_ScheduleAdvance(_This);
	}

	function _Draw(viewer, graphics)
	{
		if(!viewer._Actor)
		{
			return;
		}

		graphics.clear();
		graphics.setView(viewer._ViewTransform);
		viewer._ActorInstance.draw(graphics);
	}

	function _ScheduleAdvance(viewer)
	{
		clearTimeout(viewer._AdvanceTimeout);
		//if(document.hasFocus())
		{
			window.requestAnimationFrame(function()
				{
					_Advance(viewer);
				});	
		}
		/*else
		{
			viewer._AdvanceTimeout = setTimeout(function()
				{
					_Advance(viewer);
				}, _LowFrequencyAdvanceTime);
		}*/
	}

	SoloSlide.prototype.load = function(url, callback)
	{
		var loader = new ActorLoader();
		var _This = this;
		loader.load(url, function(actor)
		{
			if(!actor || actor.error)
			{
				callback(!actor ? null : actor.error);
			}
			else
			{
				_This.setActor(actor);
				callback();
			}
		});
	};

	SoloSlide.prototype.setActor = function(actor)
	{
		if(this._Actor)
		{
			this._Actor.dispose(this._Graphics);
		}
		if(this._ActorInstance)
		{
			this._ActorInstance.dispose(this._Graphics);
		}
		actor.initialize(this._Graphics);

		var actorInstance = actor.makeInstance();
		actorInstance.initialize(this._Graphics);
		
		this._Actor = actor;
		this._ActorInstance = actorInstance;

		if(actorInstance)
		{
			actorInstance.initialize(this._Graphics);
			if(actorInstance._Animations.length)
			{
				this._AnimationInstance = 
					this._SlideAnimation = actorInstance.getAnimation("Slide");
				this._SoloSkaterAnimation = actorInstance.getAnimation("Solo Skater");
				
				if(!this._AnimationInstance)
				{
					this._AnimationInstance = this._SoloSkaterAnimation;
				}

				if(!this._AnimationInstance) 
				{
					console.log("NO ANIMATION IN HERE!?"); return;
				}

			}
		}
	};

	SoloSlide.prototype.setSize = function(width, height)
	{
		this._Graphics.setSize(width, height);
	};

	return SoloSlide;
}());