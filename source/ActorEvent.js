var ActorEvent = (function ()
{
	function ActorEvent()
	{
		ActorNode.call(this);
	}

	ActorComponent.defineProperties(ActorEvent);
	ActorComponent.subclass(ActorEvent);
	
	ActorEvent.prototype.getTipWorldTranslation = function()
	{
		var transform = mat2d.create();
		transform[4] = this._Length;
		mat2d.mul(transform, this.getWorldTransform(), transform);
		return vec2.set(vec2.create(), transform[4], transform[5]);
	};

	ActorEvent.prototype.makeInstance = function(resetActor)
	{
		var node = new ActorEvent();
		ActorEvent.prototype.copy.call(node, this, resetActor);
		return node;	
	};

	ActorEvent.prototype.copy = function(node, resetActor)
	{
		ActorNode.prototype.copy.call(this, node, resetActor);
		this._Length = node._Length;
		this._IsConnectedToImage = node._IsConnectedToImage;
	};

	return ActorEvent;
}());