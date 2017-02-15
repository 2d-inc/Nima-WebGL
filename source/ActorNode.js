var ActorNode = (function ()
{
	function ActorNode()
	{
		ActorComponent.call(this);
		this._Children = [];
		this._Dependents = [];
		this._Transform = mat2d.create();
		this._WorldTransform = mat2d.create();
		this._OverrideWorldTransform = false;
		this._OverrideRotation = null;
		
		this._Translation = vec2.create();
		this._Rotation = 0;
		this._ParentIdx = 0;
		this._Scale = vec2.set(vec2.create(), 1, 1);
		this._Opacity = 1;
		this._RenderOpacity = 1;

		this._IsDirty = true;
		this._IsWorldDirty = true;

		this._SuppressMarkDirty = false;
	}

	function _UpdateWorldTransform(node)
	{
		node._IsWorldDirty = false;

		var transform = node._OverrideWorldTransform ? node._WorldTransform : mat2d.copy(node._WorldTransform, node.getTransform());
		
		node._RenderOpacity = node._Opacity;
		
		var parent = node._Parent;
		if(parent)
		{
			parent.updateTransforms();
			node._RenderOpacity *= parent._RenderOpacity;
			if(!node._OverrideWorldTransform)
			{
				transform = mat2d.mul(transform, parent._WorldTransform, transform);
			}
		}

		return transform;
	}

	function _UpdateTransform(node)
	{

		node._IsDirty = false;

		var r = node._OverrideRotation !== null ? node._OverrideRotation : node._Rotation;
		var t = node._Translation;

		//t[0] += 0.01;
		var s = node._Scale;
		var transform = node._Transform;

		mat2d.fromRotation(transform, r);

		transform[4] = t[0];
		transform[5] = t[1];

		mat2d.scale(transform, transform, s);

		return transform;
	}

	ActorNode.defineProperties = function(prototype)
	{
		ActorComponent.defineProperties(prototype);

		Object.defineProperties(prototype,
		{
			isNode:
			{
				get: function()
				{
					return true;
				}
			},
			x:
			{
				get: function()
				{
					return this._Translation[0];
				},
				set: function(value)
				{
					if(this._Translation[0] != value)
					{
						this._Translation[0] = value;
						this._IsDirty = true;
						this.markWorldDirty();
					}
				}
			},
			y:
			{
				get: function()
				{
					return this._Translation[1];
				},
				set: function(value)
				{
					if(this._Translation[1] != value)
					{
						this._Translation[1] = value;
						this._IsDirty = true;
						this.markWorldDirty();
					}
				}
			},
			scaleX:
			{
				get: function()
				{
					return this._Scale[0];
				},
				set: function(value)
				{
					if(this._Scale[0] != value)
					{
						this._Scale[0] = value;
						this._IsDirty = true;
						this.markWorldDirty();
					}
				}
			},
			scaleY:
			{
				get: function()
				{
					return this._Scale[1];
				},
				set: function(value)
				{
					if(this._Scale[1] != value)
					{
						this._Scale[1] = value;
						this._IsDirty = true;
						this.markWorldDirty();
					}
				}
			},
			rotation:
			{
				get: function()
				{
					return this._Rotation;
				},
				set: function(value)
				{
					if(this._Rotation != value)
					{
						this._Rotation = value;
						this._IsDirty = true;
						this.markWorldDirty();
					}
				}
			},
			opacity:
			{
				get: function()
				{
					return this._Opacity;
				},
				set: function(value)
				{
					if(this._Opacity != value)
					{
						this._Opacity = value;
						this.markWorldDirty();
					}
				}
			}
		});
	};

	ActorNode.defineProperties(ActorNode.prototype);
/*
	ActorNode.prototype = 
	{ 
		constructor:ActorNode,
		get isNode()
		{
			return true;
		},
		get x() 
		{ 
			return this._Translation[0];
		},
		set x(value)
		{
			if(this._Translation[0] != value)
			{
				this._Translation[0] = value;
				this._IsDirty = true;
				this.markWorldDirty();
			}
		},
		get y() 
		{ 
			return this._Translation[1];
		},
		set y(value)
		{
			if(this._Translation[1] != value)
			{
				this._Translation[1] = value;
				this._IsDirty = true;
				this.markWorldDirty();
			}
		},
		get scaleX() 
		{ 
			return this._Scale[0];
		},
		set scaleX(value)
		{
			if(this._Scale[0] != value)
			{
				this._Scale[0] = value;
				this._IsDirty = true;
				this.markWorldDirty();
			}
		},
		get scaleY() 
		{ 
			return this._Scale[1];
		},
		set scaleY(value)
		{
			if(this._Scale[1] != value)
			{
				this._Scale[1] = value;
				this._IsDirty = true;
				this.markWorldDirty();
			}
		},
		get rotation() 
		{ 
			return this._Rotation;
		},
		set rotation(value)
		{
			if(this._Rotation != value)
			{
				this._Rotation = value;
				this._IsDirty = true;
				this.markWorldDirty();
			}
		},
		get opacity() 
		{ 
			return this._Opacity;
		},
		set opacity(value)
		{
			if(this._Opacity != value)
			{
				this._Opacity = value;
				this.markWorldDirty();
			}
		}
	};
*/
	ActorComponent.subclass(ActorNode);

	ActorNode.prototype.overrideRotation = function(r)
	{
		if(this._OverrideRotation !== r)
		{
			this._OverrideRotation = r;
			this._IsDirty = true;
			this.markWorldDirty();
		}
	};

	ActorNode.prototype.getWorldTransform = function()
	{
		if(this._IsWorldDirty)
		{
			return _UpdateWorldTransform(this);
		}
		return this._WorldTransform;
		
	};

	ActorNode.prototype.updateTransforms = function()
	{
		if(this._IsDirty)
		{
			_UpdateTransform(this);
		}
		if(this._IsWorldDirty)
		{
			_UpdateWorldTransform(this);
		}
	};

	ActorNode.prototype.getTransform = function()
	{
		if(this._IsDirty)
		{
			_UpdateTransform(this);
		}
		return this._Transform;
	};

	ActorNode.prototype.markWorldDirty = function()
	{
		if(this._IsWorldDirty || this._SuppressMarkDirty)
		{
			return;
		}
		var c = this._Children;
		for(var i = 0; i < c.length; i++)
		{
			c[i].markWorldDirty();
		}

		var c = this._Dependents;
		for(var i = 0; i < c.length; i++)
		{
			c[i].markWorldDirty();
		}

		this._IsWorldDirty = true;
	};

	ActorNode.prototype.getWorldTranslation = function()
	{
		var transform = this.getWorldTransform();
		return vec2.set(vec2.create(), transform[4], transform[5]);
	};

	ActorNode.subclass = function(other)
	{
		ActorComponent.subclass(other);
		other.prototype.getWorldTransform = ActorNode.prototype.getWorldTransform;
		other.prototype.getTransform = ActorNode.prototype.getTransform;
		other.prototype.updateTransforms = ActorNode.prototype.updateTransforms;
		other.prototype.markWorldDirty = ActorNode.prototype.markWorldDirty;
		other.prototype.getWorldTranslation = ActorNode.prototype.getWorldTranslation;
		other.prototype.overrideRotation = ActorNode.prototype.overrideRotation;
	};

	ActorNode.prototype.makeInstance = function(resetActor)
	{
		var node = new ActorNode();
		ActorNode.prototype.copy.call(node, this, resetActor);
		return node;	
	};

	ActorNode.prototype.copy = function(node, resetActor)
	{
		ActorComponent.prototype.copy.call(this, node, resetActor);
		this._IsDirty = true;
		this._IsWorldDirty = true;
		mat2d.copy(this._Transform, node._Transform);
		mat2d.copy(this._WorldTransform, node._WorldTransform);
		vec2.copy(this._Translation, node._Translation);
		vec2.copy(this._Scale, node._Scale);
		this._Rotation = node._Rotation;
		this._Opacity = node._Opacity;
		this._RenderOpacity = node._RenderOpacity;
		this._OverrideWorldTransform = node._OverrideWorldTransform;
		this._OverrideRotation = node._OverrideRotation;
	};
	
	return ActorNode;
}());