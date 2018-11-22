function block(id, key) { return {id,key}; }

const Blocks = 
{
	Nodes: block(1, "nodes"),
	ActorNode: block(2, "node"),
	ActorBone: block(3, "bone"),
	ActorRootBone: block(4, "rootBone"),
	ActorImage: block(5, "image"),
	View: block(6, "view"),
	Animation: block(7, "animation"),
	Animations: block(8, "animations"),
	Atlases: block(9, "atlases"),
	Atlas: block(10, "atlas"),
	ActorIKTarget: block(11, "ikTarget"),
	ActorEvent: block(12, "event"),
	CustomIntProperty: block(13, "customInt"),
	CustomFloatProperty: block(14, "customFloat"),
	CustomStringProperty: block(15, "customString"),
	CustomBooleanProperty: block(16, "customBool"),
	ColliderRectangle: block(17, "rectangleCollider"),
	ColliderTriangle: block(18, "triangleCollider"),
	ColliderCircle: block(19, "circleCollider"),
	ColliderPolygon: block(20, "polygonCollider"),
	ColliderLine: block(21, "lineCollider"),
	ActorImageSequence: block(22, "imageSequence"),
	ActorNodeSolo: block(23, "solo"),
	NestedActorNode: block(24, "nestedNode"),
	JellyComponent: block(28, "jelly"),
	ActorJellyBone:  block(29, "jellyBone"),
	ActorIKConstraint: block(30, "ikConstraint"),
	ActorDistanceConstraint: block(31, "distanceConstraint"),
	ActorTranslationConstraint: block(32, "translationConstraint"),
	ActorRotationConstraint: block(33, "rotationConstraint"),
	ActorScaleConstraint: block(34, "scaleConstraint"),
	ActorTransformConstraint: block(35, "transformConstraint")
};

const _Types = {};
const _Map = new Map();
for(const key in Blocks)
{
	const value = Blocks[key];
	_Types[key] = value.id;
	_Map.set(value.key, value.id);
}


export default class Block
{
    static get Types()
    {
        return _Types;
    }

    static fromString(label)
    {
        return _Map.get(label) || 0;
    }
}