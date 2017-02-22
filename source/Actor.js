var Actor = (function ()
{
	function Actor()
	{
		Dispatcher.call(this);

		this._Components = [];
		this._Nodes = [];
		this._Images = [];
		this._Atlases = [];
		this._RootNode = new ActorNode();
		this._Components.push(this._RootNode);
		this._Nodes.push(this._RootNode);
		this._Animations = [];
		this._Solvers = [];
		this._IsInstance = false;
		this._IsImageSortDirty = false;
	}

	Actor.prototype = 
	{ 
		constructor:Actor,
		get root()
		{
			return this._RootNode;
		}
	};
	
	Dispatcher.subclass(Actor);

	Actor.prototype.resolveHierarchy = function(graphics)
	{
		var components = this._Components;
		for(var i = 1; i < components.length; i++)
		{
			var component = components[i];
			if(component != null)
			{
				component.resolveComponentIndices(components);
				if(component.isNode)
				{
					this._Nodes.push(component);
				}
				switch(component.constructor)
				{
					case ActorImage:
						this._Images.push(component);
						break;
					case ActorIKTarget:
						this._Solvers.push(component);
						break;
				}
			}
		}

		this._Images.sort(function(a,b)
		{
			return a._DrawOrder - b._DrawOrder;
		});

		this._Solvers.sort(function(a,b)
		{
			return a._Order - b._Order;
		});
	};

	Actor.prototype.dispose = function(graphics)
	{
		if(!this._IsInstance)
		{
			// Load all the atlases.
			var atlases = this._Atlases;
			for(var i = 0; i < atlases.length; i++)
			{
				var atlas = atlases[i];
				graphics.deleteTexture(graphics);
			}
		}
		var images = this._Images;
		for(var i = 0; i < images.length; i++)
		{
			images[i].dispose(this, graphics);
		}
	};

	Actor.prototype.initialize = function(graphics)
	{
		if(!this._IsInstance)
		{
			// Load all the atlases.
			var atlases = this._Atlases;
			for(var i = 0; i < atlases.length; i++)
			{
				var atlas = atlases[i];
				atlases[i] = graphics.loadTexture(atlas);
			}
		}
		var images = this._Images;
		for(var i = 0; i < images.length; i++)
		{
			images[i].initialize(this, graphics);
		}
	}

	Actor.prototype.advance = function(seconds)
	{
		// First iterate solvers to see if any is dirty.
		var solvers = this._Solvers;
		var runSolvers = false;
		for(var i = 0; i < solvers.length; i++)
		{
			var solver = solvers[i];
			if(solver.needsSolve())
			{
				runSolvers = true;
				break;
			}
		}

		var nodes = this._Nodes;
		for(var i = 0; i < nodes.length; i++)
		{
			var node = nodes[i];
			if(node)
			{
				node.updateTransforms();
			}
		}

		if(runSolvers)
		{
			for(var i = 0; i < solvers.length; i++)
			{
				var solver = solvers[i];
				solver.solveStart();
			}	

			for(var i = 0; i < solvers.length; i++)
			{
				var solver = solvers[i];
				solver.solve();
			}

			for(var i = 0; i < solvers.length; i++)
			{
				var solver = solvers[i];
				solver._SuppressMarkDirty = true;
			}

			for(var i = 0; i < nodes.length; i++)
			{
				var node = nodes[i];
				if(node)
				{
					node.updateTransforms();
				}
			}

			for(var i = 0; i < solvers.length; i++)
			{
				var solver = solvers[i];
				solver._SuppressMarkDirty = false;
			}
		}

		var components = this._Components;
		// Advance last (update graphics buffers and such).
		for(var i = 0; i < components.length; i++)
		{
			var component = components[i];
			if(component)
			{
				component.advance(seconds);
			}
		}

		if(this._IsImageSortDirty)
		{
			this._Images.sort(function(a,b)
			{
				return a._DrawOrder - b._DrawOrder;
			});
			this._IsImageSortDirty = false;
		}
	};

	Actor.prototype.draw = function(graphics)
	{
		var images = this._Images;
		for(var i = 0; i < images.length; i++)
		{
			var img = images[i];
			img.draw(graphics);
		}
	};

	Actor.prototype.getNode = function(name)
	{
		var nodes = this._Nodes;
		for(var i = 0; i < nodes.length; i++)
		{
			var node = nodes[i];
			if(node._Name === name)
			{
				return node;
			}
		}
		return null;
	};

	Actor.prototype.getAnimation = function(name)
	{
		var animations = this._Animations;
		for(var i = 0; i < animations.length; i++)
		{
			var animation = animations[i];
			if(animation._Name === name)
			{
				return animation;
			}
		}
		return null;
	};

	Actor.prototype.getAnimationInstance = function(name)
	{
		var animation = this.getAnimation(name);
		if(!animation)
		{
			return null;
		}
		return new AnimationInstance(this, animation);
	};

	Actor.prototype.makeInstance = function()
	{
		var actorInstance = new Actor();
		actorInstance._IsInstance = true;
		actorInstance.copy(this);
		return actorInstance;
	};

	Actor.prototype.copy = function(actor)
	{
		var components = actor._Components;
		this._Animations = actor._Animations;
		this._Atlases = actor._Atlases;
		this._Components.length = 0;
		for(var i = 0; i < components.length; i++)
		{
			var component = components[i];
			if(!component)
			{
				this._Components.push(null);
				continue;
			}
			var instanceNode = component.makeInstance(this);
			switch(instanceNode.constructor)
			{
				case ActorImage:
					this._Images.push(instanceNode);
					break;

				case ActorIKTarget:
					this._Solvers.push(instanceNode);
					break;
			}
			if(instanceNode.isNode)
			{
				this._Nodes.push(instanceNode);
			}
			this._Components.push(instanceNode);
		}
		this._RootNode = this._Components[0];

		for(var i = 1; i < this._Components.length; i++)
		{
			var component = this._Components[i];
			if(component == null)
			{
				continue;
			}
			component.resolveComponentIndices(this._Components);
		}

		this._Images.sort(function(a,b)
		{
			return a._DrawOrder - b._DrawOrder;
		});

		this._Solvers.sort(function(a,b)
		{
			return a._Order - b._Order;
		});
	};	

	return Actor;
}());