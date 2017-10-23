var ActorNodeSolo = (function ()
{
	function ActorNodeSolo()
	{
		ActorNode.call(this);
		this._ActiveChildIndex = 0;
	}

	ActorNode.subclass(ActorNodeSolo);

	ActorNodeSolo.prototype.setActiveChildIndex = function(idx)
	{
		if(this._ActiveChildIndex !== idx)
		{
			this._ActiveChildIndex = idx;

			for(var i = 0; i < this._Children.length; ++i)
			{
				var an = this._Children[i];
				var cv = i !== (this._ActiveChildIndex - 1);
				an.setCollapsedVisibility(cv);
			}
		}
	}

	ActorNodeSolo.prototype.makeInstance = function(resetActor)
	{
		var node = new ActorNode();
		ActorNodeSolo.prototype.copy.call(node, this, resetActor);
		return node;	
	};

	ActorNodeSolo.prototype.copy = function(node, resetActor)
	{
		ActorNode.prototype.copy.call(this, node, resetActor);
		this._ActiveChildIndex = node._ActiveChildIndex;
	}
	
	return ActorNodeSolo;
}());