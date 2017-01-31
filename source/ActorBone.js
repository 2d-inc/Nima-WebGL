var ActorBone = (function ()
{
	function ActorBone()
	{
		ActorNode.call(this);

		this._Length = 0;
		this._IsConnectedToImage = false;
	}

	ActorNode.prototype.subclass(ActorBone);
	
	ActorBone.prototype.getTipWorldTranslation = function()
	{
		var transform = mat2d.create();
		transform[4] = this._Length;
		mat2d.mul(transform, this.getWorldTransform(), transform);
		return vec2.set(vec2.create(), transform[4], transform[5]);
	};

	ActorBone.prototype.makeInstance = function(resetActor)
	{
		var node = new ActorBone();
		ActorBone.prototype.copy.call(node, this, resetActor);
		return node;	
	};

	ActorBone.prototype.copy = function(node, resetActor)
	{
		ActorNode.prototype.copy.call(this, node, resetActor);
		this._Length = node._Length;
		this._IsConnectedToImage = node._IsConnectedToImage;
	};

	return ActorBone;
}());