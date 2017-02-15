var ActorComponent = (function ()
{
	function ActorComponent()
	{
		this._Name = "Component";
		this._Parent = null;
	}

	/*ActorComponent.prototype = 
	{ 
		constructor:ActorComponent,
		get parent() 
		{ 
			return this._Parent;
		},
	};*/

	ActorComponent.defineProperties = function(prototype)
	{
		Object.defineProperties(prototype,
		{
			parent:
			{
				get: function()
				{
					return this._Parent;
				}
			}
		});
	};

	ActorComponent.defineProperties(ActorComponent.prototype);

	ActorComponent.subclass = function(other)
	{
		other.prototype.initialize = ActorComponent.prototype.initialize;
		other.prototype.advance = ActorComponent.prototype.advance;
		other.prototype.resolveComponentIndices = ActorComponent.prototype.resolveComponentIndices;
	};


	ActorComponent.prototype.initialize = function(actor, graphics)
	{

	};

	ActorComponent.prototype.advance = function(seconds)
	{
	};

	ActorComponent.prototype.resolveComponentIndices = function(components)
	{
		if(this._ParentIdx !== undefined)
		{
			this._Parent = components[this._ParentIdx];
			if(this._Parent && this._Parent._Children)
			{
				this._Parent._Children.push(this);
			}
		}
	};

	ActorComponent.prototype.copy = function(component, resetActor)
	{
		this._Name = component._Name;
		this._ParentIdx = component._ParentIdx;
		this._Idx = component._Idx;
	};
	
	return ActorComponent;
}());