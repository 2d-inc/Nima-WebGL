var ActorRootBone = (function ()
{
	function ActorRootBone()
	{
		ActorNode.call(this);
	}

	ActorNode.prototype.subclass(ActorRootBone);

	ActorRootBone.prototype.makeInstance = function(resetActor)
	{
		var node = new ActorRootBone();
		ActorRootBone.prototype.copy.call(node, this, resetActor);
		return node;	
	};

	ActorRootBone.prototype.copy = function(node, resetActor)
	{
		ActorNode.prototype.copy.call(this, node, resetActor);
	};
	
	return ActorRootBone;
}());