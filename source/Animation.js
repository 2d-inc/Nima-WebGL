var Animation = (function ()
{
	function Animation(actor)
	{
		this._Actor = actor;
		this._Components = [];
		this._TriggerComponents = [];
		this._DisplayStart = 0;
		this._DisplayEnd = 0;

		this._Name = null;
		this._FPS = 60;
		this._Duration = 0;
		this._Loop = false;
	}

	function keyFrameLocation(seconds, list, start, end)
	{
		var mid;
		var element;
		while (start <= end) 
		{
	    	mid = ((start + end) >> 1);
			element = list[mid]._Time;
			if (element < seconds) 
			{
				start = mid + 1;
			} 
			else if (element > seconds) 
			{
				end = mid - 1;
			} 
			else 
			{
				return mid;
			}
		}
		return start;
	}

	Animation.prototype.triggerEvents = function(actorComponents, fromTime, toTime, triggered)
	{
		var keyedTriggerComponents = this._TriggerComponents;
		for(var i = 0; i < keyedTriggerComponents.length; i++)
		{
			var keyedComponent = keyedTriggerComponents[i];
			var properties = keyedComponent._Properties;
			for(var j = 0; j < properties.length; j++)
			{
				var property = properties[j];
				switch(property._Type)
				{
					case AnimatedProperty.Properties.Trigger:
						var keyFrames = property._KeyFrames;

						var kfl = keyFrames.length;
						if(kfl === 0)
						{
							continue;
						}

						var idx = keyFrameLocation(toTime, keyFrames, 0, keyFrames.length-1);
						if(idx === 0)
						{
							if(keyFrames.length > 0 && keyFrames[0]._Time === toTime)
							{
								var component = actorComponents[keyedComponent._ComponentIndex];
								triggered.push({
									name:component._Name,
									component:component,
									propertyType:property._Type,
									keyFrameTime:toTime,
									elapsed:0
								});
							}
						}
						else
						{
							for(var k = idx-1; k >= 0; k--)
							{
								var frame = keyFrames[k];	
								if(frame._Time > fromTime)
								{
									var component = actorComponents[keyedComponent._ComponentIndex];
									triggered.push({
										name:component._Name,
										component:component,
										propertyType:property._Type,
										keyFrameTime:frame._Time,
										elapsed:toTime-frame._Time
									});
								}
								else
								{
									break;
								}
							}
						}
						break;
					default:
						break;
				}
			}
		}
	};

	Animation.prototype.apply = function(time, actor, mix)
	{
		var components = this._Components;
		var imix = 1.0-mix;
		var actorComponents = actor._Components;
		for(var i = 0; i < components.length; i++)
		{
			var animatedComponent = components[i];
			var component = actorComponents[animatedComponent._ComponentIndex];
			if(!component)
			{
				continue;
			}

			var properties = animatedComponent._Properties;
			for(var j = 0; j < properties.length; j++)
			{
				var property = properties[j];
				var keyFrames = property._KeyFrames;

				var kfl = keyFrames.length;
				if(kfl === 0)
				{
					continue;
				}

				var idx = keyFrameLocation(time, keyFrames, 0, keyFrames.length-1);
				var value = 0.0;

				if(idx === 0)
				{
					value = keyFrames[0]._Value;
				}
				else
				{
					if(idx < keyFrames.length)
					{
						var fromFrame = keyFrames[idx-1];
						var toFrame = keyFrames[idx];
						if(time == toFrame._Time)
						{
							value = toFrame._Value;
						}
						else
						{
							value = fromFrame.interpolate(time, toFrame);
						}
					}
					else
					{
						var kf = keyFrames[idx-1];
						value = kf._Value;
					}
				}

				var markDirty = false;
				switch(property._Type)
				{
					case AnimatedProperty.Properties.PosX:
						if(mix === 1.0)
						{
							component._Translation[0] = value;	
						}
						else
						{
							component._Translation[0] = component._Translation[0] * imix + value * mix;
						}
						
						markDirty = true;
						break;
					case AnimatedProperty.Properties.PosY:
						if(mix === 1.0)
						{
							component._Translation[1] = value;
						}
						else
						{
							component._Translation[1] = component._Translation[1] * imix + value * mix;
						}
						markDirty = true;
						break;
					case AnimatedProperty.Properties.ScaleX:
						if(mix === 1.0)
						{
							component._Scale[0] = value;
						}
						else
						{
							component._Scale[0] = value * imix + value * mix;
						}
						markDirty = true;
						break;
					case AnimatedProperty.Properties.ScaleY:
						if(mix === 1.0)
						{
							component._Scale[1] = value;
						}
						else
						{
							component._Scale[1] = value * imix + value * mix;
						}
						markDirty = true;
						break;
					case AnimatedProperty.Properties.Rotation:
						if(mix === 1.0)
						{
							component._Rotation = value;
						}
						else
						{
							component._Rotation = component._Rotation * imix + value * mix;
						}
						markDirty = true;
						break;
					case AnimatedProperty.Properties.Opacity:
						if(mix === 1.0)
						{
							component._Opacity = value;
						}
						else
						{
							component._Opacity = component._Opacity * imix + value * mix;
						}
						markDirty = true;
						break;
					case AnimatedProperty.Properties.IKStrength:
						if(mix === 1.0)
						{
							component._Strength = value;
						}
						else
						{
							component._Strength = component._Strength * imix + value * mix;	
						}
						markDirty = true;
						break;
					case AnimatedProperty.Properties.DrawOrder:
						if(actor._LastSetDrawOrder != value)
						{
							actor._LastSetDrawOrder = value;
							for(var i = 0; i < value.length; i++)
							{
								var v = value[i];
								actorComponents[v.componentIdx]._DrawOrder = v.value;
							}
							actor._IsImageSortDirty = true;
						}
						break;
					case AnimatedProperty.Properties.Length:
						markDirty = true;
						if(mix === 1.0)
						{
							component._Length = value;
						}
						else
						{
							component._Length = component._Length * imix + value * mix;
						}
						
						for(var l = 0; l < component._Children.length; l++)
						{
							var chd = component._Children[l];
							if(chd.constructor === ActorBone)
							{
								chd._Translation[0] = component._Length;
								chd._IsDirty = true;
							}
						}
						break;
					case AnimatedProperty.Properties.VertexDeform:
						component._VerticesDirty = true;
						var nv = component._NumVertices;
						var stride = component._VertexStride;
						var to = component._AnimationDeformedVertices;
						//console.log("TO", component, to);
						var from = value;
						var tidx = 0;
						var fidx = 0;
						if(mix === 1.0)
						{
							for(var l = 0; l < nv; l++)
							{
								to[tidx] = value[fidx++];
								to[tidx+1] = value[fidx++];
								tidx+=2;
								//tidx += stride;
							}
						}
						else
						{
							for(var l = 0; l < nv; l++)
							{
								to[tidx] = to[tidx] * imix + value[fidx++] * mix;
								to[tidx+1] = to[tidx+1] * imix + value[fidx++] * mix;
								tidx+=2;
								//tidx += stride;
							}
						}
						break;
					case AnimatedProperty.Properties.StringProperty:
						component._Value = value;
						break;
					case AnimatedProperty.Properties.IntProperty:
						if(mix === 1.0)
						{
							component._Value = value;	
						}
						else
						{
							component._Value = Math.round(component._Value * imix + value * mix);
						}
						break;
					case AnimatedProperty.Properties.FloatProperty:
						if(mix === 1.0)
						{
							component._Value = value;	
						}
						else
						{
							component._Value = component._Value * imix + value * mix;
						}
						break;
				}

				if(markDirty)
				{
					component._IsDirty = true;
					component.markWorldDirty();
				}
			}
		}
	};

	return Animation;
}());

var AnimatedComponent = (function ()
{
	function AnimatedComponent(componentIndex)
	{
		this._ComponentIndex = componentIndex;
		this._Properties = [];
	}

	return AnimatedComponent;
}());

var AnimatedProperty = (function ()
{
	function AnimatedProperty(type)
	{
		this._Type = type;
		this._KeyFrames = [];
	}

	AnimatedProperty.Properties = 
	{
		Unknown:0,
		PosX:1,
		PosY:2,
		ScaleX:3,
		ScaleY:4,
		Rotation:5,
		Opacity:6,
		DrawOrder:7,
		Length:8,
		VertexDeform:9,
		IKStrength:10,
		Trigger:11,
		IntProperty:12,
		FloatProperty:13,
		StringProperty:14
	};


	return AnimatedProperty;
}());

var KeyFrame = (function ()
{
	function KeyFrame()
	{
		this._Value = 0.0;
		this._Time = 0.0;
		this._Type = 0;
		this._InFactor = 0;
		this._InValue = 0;
		this._OutFactor = 0;
		this._OutValue = 0;
		this._Curve = null;
	}

	KeyFrame.Type =
	{
		Hold:0,
		Linear:1,
		Mirrored:2,
		Asymmetric:3,
		Disconnected:4,
		Progression:5
	};

	KeyFrame.prototype.setNext = function(nxt)
	{
		var t = this._Type;
		var ts = KeyFrame.Type;

		if(this._Value.constructor === Float32Array)
		{
			this._Curve = null;
			this._TmpBuffer = new Float32Array(this._Value.length);
			this.interpolate = KeyFrame.prototype.interpolateVertexBuffer;
		}
		else if(!nxt || (t === ts.Linear && nxt._type === ts.Linear) || t === ts.Hold)
		{
			this._Curve = null;
			this.interpolate = t === ts.Hold ? KeyFrame.prototype.interpolateHold : KeyFrame.prototype.interpolateLinear;
		}
		else
		{
			var timeRange = nxt._Time - this._Time;
			var outTime = this._Time + timeRange * this._OutFactor;
			var inTime = nxt._Time - timeRange * nxt._InFactor;

			this._Curve = new BezierAnimationCurve([this._Time, this._Value], [outTime, this._OutValue], [inTime, nxt._InValue], [nxt._Time, nxt._Value]);
			this.interpolate = KeyFrame.prototype.interpolateCurve;
		}
	};

	KeyFrame.prototype.interpolateVertexBuffer = function(t, nxt)
	{
		var mix = (t - this._Time)/(nxt._Time-this._Time);
		var mixi = 1.0 - mix;
		var wr = this._TmpBuffer;
		var from = this._Value;
		var to = nxt._Value;
		var l = to.length;

		for(var i = 0; i < l; i++)
		{
			wr[i] = from[i] * mixi + to[i] * mix;
		}

		return wr;
	};

	KeyFrame.prototype.interpolateHold = function(t, nxt)
	{
		return this._Value;
	};

	KeyFrame.prototype.interpolateCurve = function(t, nxt)
	{
		return this._Curve.get(t);
	};

	KeyFrame.prototype.interpolateLinear = function(t, nxt)
	{
		var mix = (t - this._Time)/(nxt._Time-this._Time);
		return this._Value * (1.0-mix) + nxt._Value * mix;
	};
	
	/*KeyFrame.prototype.interpolate = function(t, nxt)
	{
		if(this._Type === KeyFrame.Type.Hold)
		{
			return this._Value;
		}
		else if(!this._Curve)
		{	
			var mix = (t - this._Time)/(nxt._Time-this._Time);
			return this._Value * (1.0-mix) + nxt._Value * mix;
		}

		return this._Curve.get(t);
	};*/

	return KeyFrame;
}());

var AnimationInstance = (function ()
{
	function AnimationInstance(actor, animation)
	{
		Dispatcher.call(this);
		this._Actor = actor;
		this._Animation = animation;
		this._Time = 0;

		this._Min = 0;
		this._Max = animation._Duration;
		this._Loop = animation._Loop;
		this._Range = this._Max - this._Min;
	}

	Dispatcher.subclass(AnimationInstance);

	Object.defineProperties(AnimationInstance.prototype,
	{
		loop:
		{
			get: function()
			{
				return this._Loop;
			},
			set: function(value)
			{
				this._Loop = value;
			}
		},
		time:
		{
			get: function()
			{
				return this._Time;
			},
			set: function(newTime)
			{
				var delta = newTime - this._Time;
				var time = this._Time + (delta % this._Range);

				if(time < this._Min)
				{
					if(this._Loop)
					{
						time = this._Max - (this._Min - time);	
					}
					else
					{
						time = this._Min;
					}
				}
				else if(time > this._Max)
				{
					if(this._Loop)
					{
						time = this._Min + (time - this._Max);
					}
					else
					{
						time = this._Max;
					}
				}
				this._Time = time;
			}
		}
	});

	AnimationInstance.prototype.advance = function(seconds)
	{
		var triggeredEvents = [];
		var actorComponents = this._Actor._Components;
		var time = this._Time;
		time += seconds%this._Range;
		if(time < this._Min)
		{
			if(this._Loop)
			{
				this._Animation.triggerEvents(actorComponents, time, this._Time, triggeredEvents);
				time = this._Max - (this._Min - time);
				this._Animation.triggerEvents(actorComponents, time, this._Max, triggeredEvents);
			}
			else
			{
				time = this._Min;
				if(this._Time != time)
				{
					this._Animation.triggerEvents(actorComponents, this._Min, this._Time, triggeredEvents);
				}
			}
		}
		else if(time > this._Max)
		{
			if(this._Loop)
			{
				this._Animation.triggerEvents(actorComponents, time, this._Time, triggeredEvents);
				time = this._Min + (time - this._Max);
				this._Animation.triggerEvents(actorComponents, this._Min-0.001, time, triggeredEvents);
			}
			else
			{
				time = this._Max;
				if(this._Time != time)
				{
					this._Animation.triggerEvents(actorComponents, this._Time, this._Max, triggeredEvents);
				}
			}
		}
		else if(time > this._Time)
		{
			this._Animation.triggerEvents(actorComponents, this._Time, time, triggeredEvents);
		}
		else
		{
			this._Animation.triggerEvents(actorComponents, time, this._Time, triggeredEvents);
		}

		for(var i = 0; i < triggeredEvents.length; i++)
		{
			var event = triggeredEvents[i];
			this.dispatch("animationEvent", event);
			this._Actor.dispatch("animationEvent", event);
		}
		this._Time = time;
	};

	AnimationInstance.prototype.apply = function(actor, mix)
	{
		this._Animation.apply(this._Time, actor, mix);
	};

	return AnimationInstance;
}());