var CustomProperty = (function ()
{
	function CustomProperty()
	{
		ActorComponent.call(this);
		this._PropertyType = CustomProperty.Integer;
		this._Value = 0;
	}

	CustomProperty.defineProperties = function(prototype)
	{
		ActorComponent.defineProperties(prototype);

		Object.defineProperties(prototype,
		{
			propertyType:
			{
				get: function()
				{
					return this._PropertyType;
				}
			},
			value:
			{
				get: function()
				{
					return this._Value;
				}
			}
		});
	};

	CustomProperty.defineProperties(CustomProperty.prototype);
	ActorComponent.subclass(CustomProperty);

	CustomProperty.prototype.makeInstance = function(resetActor)
	{
		var node = new CustomProperty();
		CustomProperty.prototype.copy.call(node, this, resetActor);
		return node;	
	};

	CustomProperty.prototype.copy = function(node, resetActor)
	{
		ActorComponent.prototype.copy.call(this, node, resetActor);
		this._PropertyType = node._PropertyType;
		this._Value = node._Value;
	};

	CustomProperty.prototype.resolveComponentIndices = function(components)
	{
		ActorComponent.prototype.resolveComponentIndices.call(this, components);
		if(this._ParentIdx !== undefined)
		{
			this._Parent = components[this._ParentIdx];
			if(this._Parent)
			{
				this._Parent._CustomProperties.push(this);	
			}
		}
	};

	CustomProperty.Type =
	{
		Integer:0,
		Float:1,
		String:2
	};

	return CustomProperty;
}());