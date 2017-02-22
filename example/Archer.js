var Archer = (function ()
{
	//var _LowFrequencyAdvanceTime = 1/15*1000;		TEST	test
	var _ViewCenter = [0.0, 2000.0];
	var _Scale = 0.2;
	var _ScreenScale = 1.0;

	var _AimLookup = new Array(40);
	var _AimWalkingLookup = new Array(40);
	var _Actor;

	var _MaxBoostSpeed = 1000.0;
	var _BoostForce = 6000.0;
	var _GravityForce = -3000.0;
	var _JumpForce = 50000.0;
	var _JumpForceTime = 0.3;
	var _JumpDelay = 0.2;

	function Archer(canvas)
	{
		this._Graphics = new Graphics(canvas);
		this._LastAdvanceTime = Date.now();
		this._ViewTransform = mat2d.create();
		this._AimAnimation = null;
		this._IdleAnimation = null;
		this._FireAnimation = null;
		this._ReloadAnimation = null;
		this._HorizontalSpeed = 0;
		this._Fast = false;
		this._JetSpeed = 0;
		this._WalkMix = 0;
		this._RunMix = 0;
		this._SoarMix = 0;
		this._FallMix = 0;
		this._AirTime = 0;

		this._GroundSpeedProperty = null;

		this._Y = 0.0;
		this._YVelocity = 0.0;
		this._OnGround = true;
		this._JumpEnergy = 0.0;
		this._JumpDelay = 0.0;
		this._BoostMix = 0.0;

		this._IdleTime = 0.0;
		this._RunTime = 0.0;
		this._SoarTime = 0.0;
		this._FallTime = 0.0;
		this._LandTime = 0.0;
		this._JumpTime = 0.0;
		this._JetOffTime = 0.0;
		this._JetOnTime = 0.0;
		this._AimTime = 0.0;
		this._FireTime = -1.0;
		this._ReloadTime = -1.0;
		this._WalkToIdleTime = 0.0
		this._BoostForwardTime = 0.0;
		this._BoostBackwardTime = 0.0;
		this._ReloadMix = 0.0;
		this._IsReloadReceding = false;

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
				case 32:
					_JumpNext = true;
					break;
				case 16: // shift
					_This._Fast = true;
					break;
				case 68:
				case 39:
					_This._HorizontalSpeed = 1.0;
					break;	
				case 65:
				case 37:
					_This._HorizontalSpeed = -1.0;
					break;	
				case 87:
				case 38:
					_This._JetSpeed = 1.0;
					break;

			}
		});
		document.addEventListener("keyup", function(ev)
		{
			switch(ev.keyCode)
			{
				case 16: // shift
					_This._Fast = false;
					break;
				case 68:
				case 39:
					if(_This._HorizontalSpeed === 1.0)
					{
						_This._HorizontalSpeed = 0.0;
					}
					break;	
				case 65:
				case 37:
					if(_This._HorizontalSpeed === -1.0)
					{
						_This._HorizontalSpeed = 0.0;
					}
					break;	
				case 87:
				case 38:
					_This._JetSpeed = 0.0;
					break;
			}
		});
	}

	var _ScreenMouse = vec2.create();
	var _WorldMouse = vec2.create();
	var _FireNext = false;
	var _JumpNext = false;

	document.addEventListener("mousemove", function(ev)
	{
		_ScreenMouse[0] = ev.clientX;
		_ScreenMouse[1] = ev.clientY;
	});



	document.addEventListener("mousedown", function(ev)
	{
		_FireNext = true;
	});

	function _Advance(_This)
	{
		_This.setSize(window.innerWidth, window.innerHeight);

		var now = Date.now();
		var elapsed = (now - _This._LastAdvanceTime)/1000.0;
		_This._LastAdvanceTime = now;

		var graphics = _This._Graphics;
		
		var w = graphics.viewportWidth;
		var h = graphics.viewportHeight;

		_ViewCenter[1] = h*2.0;

		var vt = _This._ViewTransform;
		vt[0] = _Scale;
		vt[3] = _Scale;
		vt[4] = (-_ViewCenter[0] * _Scale + w/2);
		vt[5] = (-_ViewCenter[1] * _Scale + h/2);

		var inverseViewTransform = mat2d.invert(mat2d.create(), vt);

		_WorldMouse[0] = _ScreenMouse[0] * _ScreenScale;
		_WorldMouse[1] = graphics.viewportHeight - _ScreenMouse[1] * _ScreenScale;

		vec2.transformMat2d(_WorldMouse, _WorldMouse, inverseViewTransform);

		var actor = _This._ActorInstance;
		if(actor)
		{
			var scaleX = 1.0;
			if(_WorldMouse[0] < actor._RootNode._Translation[0])
			{
				scaleX = -1.0;
			}

			if(actor._RootNode._Scale[0] != scaleX)
			{
				actor._RootNode._Scale[0] = scaleX;	
				actor._RootNode._IsDirty = true;
				actor._RootNode.markWorldDirty();
			}

			if(_This._IdleAnimation)
			{
				var ai = _This._IdleAnimation;
				_This._IdleTime = (_This._IdleTime + elapsed)%_This._IdleAnimation._Duration;
				_This._IdleAnimation.apply(_This._IdleTime, actor, 1.0);
			}

			var mixSpeed = 3.5;
			if(_This._OnGround && _This._HorizontalSpeed !== 0 && _This._JetSpeed === 0)
			{
				if(_This._Fast)
				{
					if(_This._WalkMix > 0.0)
					{
						_This._WalkMix = Math.max(0.0, _This._WalkMix - elapsed * mixSpeed);
					}
					if(_This._RunMix < 1.0)
					{
						_This._RunMix = Math.min(1.0, _This._RunMix + elapsed * mixSpeed);
					}
				}
				else
				{
					if(_This._WalkMix < 1.0)
					{
						_This._WalkMix = Math.min(1.0, _This._WalkMix + elapsed * mixSpeed);
					}
					if(_This._RunMix > 0.0)
					{
						_This._RunMix = Math.max(0.0, _This._RunMix - elapsed * mixSpeed);
					}
				}

				_This._WalkToIdleTime = 0;
			}
			else
			{
				if(_This._WalkMix > 0.0)
				{
					_This._WalkMix = Math.max(0.0, _This._WalkMix - elapsed * mixSpeed);
				}
				if(_This._RunMix > 0.0)
				{
					_This._RunMix = Math.max(0.0, _This._RunMix - elapsed * mixSpeed);
				}
			}

			if(_This._JetSpeed > 0 && Math.abs(_This._HorizontalSpeed) > 0.0)
			{
				_This._BoostMix += Math.sign(_This._HorizontalSpeed) * scaleX * Math.min(1.0, elapsed*10);
				_This._BoostMix = Math.max(-1.0, Math.min(1.0, _This._BoostMix));
			}
			else
			{
				if(_This._BoostMix > 0)
				{
					_This._BoostMix -= elapsed;
					if(_This._BoostMix < 0)
					{
						_This._BoostMix = 0;
						_This.BoostForwardTime = 0.0;
						_This.BoostBackwardTime = 0.0;
					}
				}
				else if(_This._BoostMix < 0)
				{
					_This._BoostMix += elapsed;
					if(_This._BoostMix > 0)
					{
						_This._BoostMix = 0;
						_This.BoostForwardTime = 0.0;
						_This.BoostBackwardTime = 0.0;
					}
				}
			}

			if(_This._JetSpeed !== 0.0)
			{
				_This._SoarMix = Math.min(1.0, _This._SoarMix + elapsed * mixSpeed);
			}
			else
			{
				_This._SoarMix = Math.max(0.0, _This._SoarMix - elapsed * mixSpeed);
			}


			var moveSpeed = _This._Fast ? 1100.0 : 600.0;

			var speedModifier = (_This._Fast ? 1.0 - _This._GroundSpeedProperty.value : _This._GroundSpeedProperty.value)*0.5+0.5;
			actor._RootNode._Translation[0] += _This._HorizontalSpeed * (speedModifier) * /*(0.5 + 0.5*moveMix) */ elapsed * moveSpeed;	
			actor._RootNode._IsDirty = true;
			actor._RootNode.markWorldDirty();

			if(_JumpNext)
			{
				_This._JumpDelay = _JumpDelay;
				_JumpNext = false;
				if(_This._AirTime < 0.2)
				{
					_This._JumpTime = 0.0;
				}
			}
			
			if(_This._JumpDelay)
			{
				_This._JumpDelay -= elapsed;
				if(_This._JumpDelay <= 0.0)
				{
					_This._JumpDelay = 0.0;		
					if(_This._OnGround)
					{
						_This._JumpEnergy = _JumpForceTime;
					}
				}
			}

			{
				_This._YVelocity += elapsed * _BoostForce * _This._JetSpeed;
				_This._YVelocity += elapsed * _GravityForce;

				if(_This._JumpEnergy > 0)
				{
					_This._YVelocity += _This._JumpEnergy * elapsed * _JumpForce;
					_This._JumpEnergy -= elapsed;
				}

				if(_This._YVelocity > _MaxBoostSpeed)
				{
					_This._YVelocity = _MaxBoostSpeed;
				}
			}

			_This._Y += _This._YVelocity * elapsed;

			var lastYVelocity = _This._YVelocity;
			if(_This._Y < 0)
			{
				_This._Y = 0.0;
				_This._YVelocity = 0.0;
			}

			if(_This._Y > 0)
			{
				_This._OnGround = false;
				_This._AirTime += elapsed;
			}
			else if(!_This._OnGround)
			{
				_This._AirTime = 0;
				_This._OnGround = true;
				// We hit! Play land animation.
				if(lastYVelocity < -1500.0)
				{
					_This._LandTime = 0.0;
				}
				else
				{
					_This._WalkToIdleTime = 0.0;
				}
			}
			actor._RootNode._Translation[1] = _This._Y;
			actor._RootNode._IsDirty = true;
			actor._RootNode.markWorldDirty();

			if(_This._YVelocity < 0.0)
			{
				_This._FallMix = Math.min(1.0, _This._FallMix + elapsed * mixSpeed);
			}
			else
			{
				_This._FallMix = Math.max(0.0, _This._FallMix - elapsed * mixSpeed);
			}



			var walk = _This._WalkAnimation;
			var run = _This._RunAnimation;
			var soar = _This._SoarAnimation;
			var fall = _This._FallAnimation;
			if((_This._HorizontalSpeed === 0 || !_This._OnGround) && _This._WalkMix === 0 && _This._RunMix === 0)
			{
				walk.time = 0.0;
				_This._RunTime = 0.0;
			}
			else
			{
				walk.advance(elapsed*0.9 * Math.sign(_This._HorizontalSpeed) * scaleX * (_This._Fast ? 1.2 : 1.0));
				//_This._WalkTime = (_This._WalkTime + elapsed*0.9 * Math.sign(_This._HorizontalSpeed) * scaleX)%walk._Duration;
				/*if(_This._WalkTime < 0.0)
				{
					_This._WalkTime += walk._Duration;
				}*/
				_This._RunTime = walk.time/walk._Animation._Duration * run._Duration;
			}
			
			if(_This._WalkMix != 0.0)
			{
				//walk.setTime(walk.getTime() + elapsed*0.9 * Math.sign(_This._HorizontalSpeed) * scaleX);
				walk.apply(actor, _This._WalkMix);
			}
			if(_This._RunMix != 0.0)
			{
				//run.setTime(run.getTime() + elapsed*0.9 * Math.sign(_This._HorizontalSpeed) * scaleX);
				run.apply(_This._RunTime, actor, _This._RunMix);
			}
			if(_This._SoarMix != 0.0)
			{
				_This._SoarTime = (_This._SoarTime+elapsed)%soar._Duration;
				soar.apply(_This._SoarTime, actor, _This._SoarMix);
			}
			if(_This._FallMix != 0.0)
			{
				_This._FallTime = (_This._FallTime+elapsed)%fall._Duration;
				fall.apply(_This._FallTime, actor, _This._FallMix);
			}

			if(_This._BoostMix > 0.0)
			{
				_This._BoostForwardTime += elapsed;
				_This._BoostForward.apply(_This._BoostForwardTime, actor, _This._BoostMix);
			}
			else if(_This._BoostMix < 0.0)
			{
				_This._BoostBackwardTime += elapsed;
				_This._BoostBackward.apply(_This._BoostBackwardTime, actor, -_This._BoostMix);
			}

			if(_This._OnGround && _This._HorizontalSpeed === 0 && _This._WalkToIdleTime < _This._WalkToIdle._Duration)
			{
				_This._WalkToIdleTime += elapsed;
				_This._WalkToIdle.apply(_This._WalkToIdleTime, actor, Math.min(1.0, _This._WalkToIdleTime/_This._WalkToIdle._Duration));
				_This._RunMix = _This._WalkMix = 0.0;
			}

			if(_This._LandTime < _This._LandAnimation._Duration)
			{
				_This._LandTime += elapsed;
				_This._LandAnimation.apply(_This._LandTime, actor, Math.min(1.0, _This._LandTime/0.15));
			}
			if(_This._JumpTime < _This._JumpAnimation._Duration)
			{
				_This._JumpTime += elapsed;
				_This._JumpAnimation.apply(_This._JumpTime, actor, Math.min(1.0, _This._JumpTime/0.15));
			}

			if(_This._JetSpeed)
			{
				_This._JetOnTime += elapsed;
				_This._JetOn.apply(_This._JetOnTime, actor, Math.min(1.0, _This._JetOnTime/0.1));
				_This._JetOffTime = 0.0;
			}
			else
			{
				_This._JetOffTime += elapsed;
				_This._JetOff.apply(_This._JetOffTime, actor, Math.min(1.0, _This._JetOffTime/0.1));
				_This._JetOnTime = 0.0;
			}
			if(_This._AimAnimation)
			{
				var inverseToActor = mat2d.invert(mat2d.create(), actor._RootNode.getWorldTransform());
				var actorMouse = vec2.transformMat2d(vec2.create(), _WorldMouse, inverseToActor);
				// See where the mouse is relative to the tip of the weapon
				var maxDot = -1;
				var bestIndex = 0;
				var lookup = _This._HorizontalSpeed === 0 ? _AimLookup : _AimWalkingLookup;
				for(var i = 0; i < lookup.length; i++)
				{
					var aim = lookup[i];
					var aimDir = vec2.clone(aim[0]);
					var aimPos = vec2.clone(aim[1]);

					//aimPos[0] *= scaleX;
					//aimDir[0] *= scaleX;

					var targetDir = vec2.subtract(vec2.create(), actorMouse, aimPos);
					vec2.normalize(targetDir, targetDir);
					var d = vec2.dot(targetDir, aimDir);
					if(d > maxDot)
					{
						maxDot = d;
						bestIndex = i;
					}
				}

				var aimTime = bestIndex/(lookup.length-1) * _This._AimAnimation._Duration;
				_This._AimTime += (aimTime-_This._AimTime) * Math.min(1, elapsed*10);
				_This._AimAnimation.apply(_This._AimTime, actor, 1.0);
			}

			if(_FireNext)
			{
				_This._FireTime = 0.0;
				_FireNext = false;
			}
			if(_This._FireTime >= 0.0)
			{
				_This._FireTime += elapsed;
				_This._FireAnimation.apply(_This._FireTime, actor, 1.0);
				if(_This._FireTime >= _This._FireAnimation._Duration)
				{
					_This._FireTime = -1;
					_This._ReloadTime = 0.0;
					_This._ReloadMix = 0.0;
					_This._IsReloadReceding = false;
				}
			}
			if(_This._ReloadTime >= 0.0)
			{
				var mixSpeed = 8.0;
				if(_This._IsReloadReceding)
				{
					_This._ReloadMix = Math.max(0.0, _This._ReloadMix-elapsed*mixSpeed); 
					if(_This._ReloadMix <= 0.0)
					{
						_This._ReloadTime = -1;
						_This._IsReloadReceding = false;
					}
					else
					{
						_This._ReloadAnimation.apply(_This._ReloadTime, actor, _This._ReloadMix);
					}
				}
				else
				{
					_This._ReloadMix = Math.min(1.0, _This._ReloadMix+elapsed*mixSpeed); 
					_This._ReloadTime += elapsed;
					if(_This._ReloadTime >= _This._ReloadAnimation._Duration)
					{
						_This._IsReloadReceding = true;
					}
					_This._ReloadAnimation.apply(_This._ReloadTime, actor, _This._ReloadMix);
				}
			}


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

	Archer.prototype.load = function(url, callback)
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

	Archer.prototype.setActor = function(actor)
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

		var archer = this;
		this._ActorInstance.addEventListener("animationEvent", function(event)
		{
			switch(event.name)
			{
				case "Step":
					// Only play the step sound if the run or walk animation is mixed enough over a threshold.
					if(archer._WalkMix > 0.5 || archer._RunMix > 0.5)
					{
						document.getElementById("sound").currentTime = 0;
						document.getElementById("sound").play();
					}
					break;
			}
		});

		if(actorInstance)
		{
			actorInstance.initialize(this._Graphics);
			if(actorInstance._Animations.length)
			{
				this._FireAnimation = actorInstance.getAnimation("Fire");
				this._ReloadAnimation = actorInstance.getAnimation("Reload");
				this._WalkToIdle = actorInstance.getAnimation("WalkToIdle");
				this._WalkAnimation = actorInstance.getAnimationInstance("Walk");
				this._RunAnimation = actorInstance.getAnimation("Run");
				this._IdleAnimation = actorInstance.getAnimation("Idle");
				this._JetOn = actorInstance.getAnimation("JetOn");
				this._JetOff = actorInstance.getAnimation("JetOff");
				this._SoarAnimation = actorInstance.getAnimation("Soar");
				this._FallAnimation = actorInstance.getAnimation("Fall");
				this._LandAnimation = actorInstance.getAnimation("Land");
				this._JumpAnimation = actorInstance.getAnimation("Jump");

				this._LandTime = this._LandAnimation._Duration;
				this._JumpTime = this._JumpAnimation._Duration;

				this._BoostForward = actorInstance.getAnimation("BoostForward");
				this._BoostBackward = actorInstance.getAnimation("BoostBackward");

				var aim = this._AimAnimation = actorInstance.getAnimation("Aim2");
				if(aim)
				{
					// Find arrow node.
					var arrowNode = actor.getNode("Muzzle");

					var character = actorInstance.getNode("Character");
					if(character)
					{
						this._GroundSpeedProperty = character.getCustomProperty("GroundSpeed")
					}

					// Build look up table.
					if(arrowNode)
					{
						for(var i = 0; i < _AimLookup.length; i++)
						{
							var position = i / (_AimLookup.length-1) * aim._Duration;
							aim.apply(position, actor, 1.0);
							var m = arrowNode.getWorldTransform();
							_AimLookup[i] = [
								vec2.normalize(vec2.create(), vec2.set(vec2.create(), m[0], m[1])),
								vec2.set(vec2.create(), m[4], m[5]),
							];
						}

						// Apply first frame of walk to extract the aim while walking lookup.
						this._WalkAnimation.time = 0.0;
						this._WalkAnimation.apply(actor, 1.0);
						for(var i = 0; i < _AimWalkingLookup.length; i++)
						{
							var position = i / (_AimWalkingLookup.length-1) * aim._Duration;
							aim.apply(position, actor, 1.0);
							var m = arrowNode.getWorldTransform();
							_AimWalkingLookup[i] = [
								vec2.normalize(vec2.create(), vec2.set(vec2.create(), m[0], m[1])),
								vec2.set(vec2.create(), m[4], m[5]),
							];
						}
					}

					this._JetOffTime = this._JetOff._Duration;
					this._JetOff.apply(this._JetOffTime, actor, 1.0);
				}
			}
		}
	};

	Archer.prototype.setSize = function(width, height)
	{
		this._Graphics.setSize(width, height);
	};

	return Archer;
}());