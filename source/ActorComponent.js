export default class ActorComponent
{
	constructor()
	{
		this._Name = "Component";
		this._Parent = null;
		this._CustomProperties = [];
	}

	get parent()
	{
		return this._Parent;
	}

	initialize(actor, graphics)
	{

	}

	advance(seconds)
	{
	}

	resolveComponentIndices(components)
	{
		if(this._ParentIdx !== undefined)
		{
			this._Parent = components[this._ParentIdx];
			if(this.isNode && this._Parent && this._Parent._Children)
			{
				this._Parent._Children.push(this);
			}
		}
	}

	copy(component, resetActor)
	{
		this._Name = component._Name;
		this._ParentIdx = component._ParentIdx;
		this._Idx = component._Idx;
	}

	getCustomProperty(name)
	{
		let props = this._CustomProperties;
		for(let prop of props)
		{
			if(prop._Name === name)
			{
				return prop;
			}
		}
		return null;
	}
}