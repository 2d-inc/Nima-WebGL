function block(id, key) { return {id,key}; }

const Blocks = 
{
	Unknown: block(0, "unknown"),
	PosX: block(1, "posX"),
	PosY: block(2, "posY"),
	ScaleX: block(3, "scaleX"),
	ScaleY: block(4, "scaleY"),
	Rotation: block(5, "rotation"),
	Opacity: block(6, "opacity"),
	DrawOrder: block(7, "drawOrder"),
	Length: block(8, "length"),
	VertexDeform: block(9, "vertices"),
	ConstraintStrength: block(10, "strength"),
	Trigger: block(11, "trigger"),
	IntProperty: block(12, "intValue"),
	FloatProperty: block(13, "floatValue"),
	StringProperty: block(14, "stringValue"),
	BooleanProperty: block(15, "boolValue"),
	IsCollisionEnabled: block(16, "isCollisionEnabled"),
	Sequence: block(17, "sequence"),
	ActiveChildIndex:  block(18, "activeChild")
};

const _Types = {};
const _Map = new Map();
for(const key in Blocks)
{
	const value = Blocks[key];
	_Types[key] = value.id;
	_Map.set(value.key, value.id);
}

export default class AnimatedProperty
{
	constructor(type)
	{
		this._Type = type;
		this._KeyFrames = [];
	}

    static get Types()
    {
        return _Types;
    }

    static fromString(label)
    {
        return _Map.get(label) || 0;
    }
}
