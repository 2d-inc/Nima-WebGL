var Actor = (function ()
{
	function Actor()
	{
		this._Nodes = [];
		this._Images = [];
		this._Atlases = [];
		this._RootNode = new ActorNode();
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
	
	Actor.prototype.resolveHierarchy = function(graphics)
	{
		var nodes = this._Nodes;
		for(var i = 1; i < nodes.length; i++)
		{
			var node = nodes[i];
			if(node != null)
			{
				node.resolveNodeIndices(nodes);
				switch(node.constructor)
				{
					case ActorImage:
						this._Images.push(node);
						break;
					case ActorIKTarget:
						this._Solvers.push(node);
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
		var nodes = this._Images;
		for(var i = 0; i < nodes.length; i++)
		{
			nodes[i].dispose(this, graphics);
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
		var nodes = this._Images;
		for(var i = 0; i < nodes.length; i++)
		{
			nodes[i].initialize(this, graphics);
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
			node.updateTransforms();
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
				node.updateTransforms();
			}

			for(var i = 0; i < solvers.length; i++)
			{
				var solver = solvers[i];
				solver._SuppressMarkDirty = false;
			}
		}

		// Advance last (update graphics buffers and such).
		for(var i = 0; i < nodes.length; i++)
		{
			var node = nodes[i];
			node.advance(seconds);
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

	Actor.prototype.makeInstance = function()
	{
		var actorInstance = new Actor();
		actorInstance._IsInstance = true;
		actorInstance.copy(this);
		return actorInstance;
	};

	Actor.prototype.copy = function(actor)
	{
		var nodes = actor._Nodes;
		this._Animations = actor._Animations;
		this._Atlases = actor._Atlases;
		this._Nodes.length = 0;
		for(var i = 0; i < nodes.length; i++)
		{
			var node = nodes[i];
			var instanceNode = node.makeInstance(this);
			switch(instanceNode.constructor)
			{
				case ActorImage:
					this._Images.push(instanceNode);
					break;

				case ActorIKTarget:
					this._Solvers.push(instanceNode);
					break;
			}
			this._Nodes.push(instanceNode);
		}
		this._RootNode = this._Nodes[0];

		for(var i = 1; i < this._Nodes.length; i++)
		{
			var node = this._Nodes[i];
			if(node == null)
			{
				continue;
			}
			node.resolveNodeIndices(this._Nodes);
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