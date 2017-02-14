var ActorLoader = (function ()
{
	var _FirstVersion = 1065353216;
	var _BlockTypes = {
		Nodes:1,
		ActorNode:2,
		ActorBone:3,
		ActorRootBone:4,
		ActorImage:5,
		View:6,
		Animation:7,
		Animations:8,
		Atlases:9,
		Atlas:10,
		ActorIKTarget:11
	};

	function ActorLoader()
	{

	}	

	ActorLoader.prototype.load = function(url, callback)
	{
		if(url.constructor === String)
		{
			var req = new XMLHttpRequest();
			req.open("GET", url, true);
			req.responseType = "blob";
			req.onload = function()
			{
				var fileReader = new FileReader();
				fileReader.onload = function() 
				{
					_ReadShot(this.result, callback);
				};
				fileReader.readAsArrayBuffer(this.response);
			};
			req.send();
		}
		else
		{
			var fileReader = new FileReader();
			fileReader.onload = function() 
			{
				_ReadShot(this.result, callback);
			};
			fileReader.readAsArrayBuffer(url);
		}
	}

	function _ReadNextBlock(reader, error)
	{
		if(reader.isEOF())
		{
			return null;
		}
		try
		{
			var blockType = reader.readUint8();
			if(blockType === undefined)
			{
				return null;
			}
			var length = reader.readUint32();

			var uint8 = new Uint8Array(length);
			//console.log("TYPE", blockType, "LENGTH", length);
			reader.readRaw(uint8, length);
		}
		catch(err)
		{
			console.log(err.constructor);
			if(error)
			{
				error(err);
			}
			return null;
		}
		return {type:blockType, reader:new BinaryReader(uint8)};
	}

	function _ReadNodesBlock(actor, reader)
	{
		var nodeCount = reader.readUint16();
		var actorNodes = actor._Nodes;

		// Guaranteed from the exporter to be in index order.
		var block = null;
		while((block=_ReadNextBlock(reader, function(err) {actor.error = err;})) !== null)
		{
			var node = null;
			switch(block.type)
			{
				case _BlockTypes.ActorNode:
					node = _ReadActorNode(block.reader, new ActorNode());
					break;
				case _BlockTypes.ActorBone:
					node = _ReadActorBone(block.reader, new ActorBone());
					break;
				case _BlockTypes.ActorRootBone:
					node = _ReadActorRootBone(block.reader, new ActorRootBone());
					break;
				case _BlockTypes.ActorImage:
					node = _ReadActorImage(block.reader, new ActorImage());
					break;
				case _BlockTypes.ActorIKTarget:
					node = _ReadActorIKTarget(block.reader, new ActorIKTarget());
					break;
			}
			if(node)
			{
				node._Index = actorNodes.length;
			}
			actorNodes.push(node);
		};

		actor.resolveHierarchy();
		/*
		// Resolve hierarchy.
		for(var i = 1; i < actorNodes.length; i++)
		{
			var node = actorNodes[i];
			if(node._ParentIdx !== undefined)
			{
				node._Parent = actorNodes[node._ParentIdx];
				node._Parent._Children.push(node);
				delete node._ParentIdx;
			}

			// Link up bone indices.
			switch(node.constructor)
			{
				case ActorImage:
					if(node._ConnectedBones)
					{
						for(var j = 0; j < node._ConnectedBones.length; j++)
						{
							var cb = node._ConnectedBones[j];
							cb.node = actorNodes[cb.nodeIndex];
							delete cb.nodeIndex;
						}
					}
					break;

				case ActorIKTarget:
					if(node._InfluencedBones)
					{
						for(var j = 0; j < node._InfluencedBones.length; j++)
						{
							var nodeIndex = node._InfluencedBones[j];
							node._InfluencedBones[j] = actorNodes[nodeIndex];
						}
					}
					break;
			}
			
		}
		*/
	}

	function _ReadAnimationBlock(actor, reader)
	{
		var animation = new Animation(actor);
		actor._Animations.push(animation);

		if(actor.dataVersion >= 11)
		{
			animation._Name = reader.readString();
			animation._FPS = reader.readUint8();
			animation._Duration = reader.readFloat32();
			animation._Loop = reader.readUint8() === 1;
		}

		// Read the number of keyed nodes.
		var numKeyedNodes = reader.readUint16();
		if(numKeyedNodes > 0)
		{	
			for(var i = 0; i < numKeyedNodes; i++)
			{
				var nodeIndex = reader.readUint16();
				var node = actor._Nodes[nodeIndex];
				if(!node)
				{
					// Bad node was loaded, read past the animation data.
 					// Note this only works after version 12 as we can read by the entire set of properties.
 					var props = reader.readUint16();
 					for(var j = 0; j < props; j++)
 					{
 						var propertyBlock = _ReadNextBlock(reader, function(err) {actor.error = err;});
 					}
				}
				else
				{
					var animatedNode = new AnimatedNode(nodeIndex);
					animation._Nodes.push(animatedNode);

					var props = reader.readUint16();
					for(var j = 0; j < props; j++)
					{
						var propertyReader = null;
						var propertyType;
						
						if(actor.dataVersion >= 12)
						{
							// Since version 12 we write properties as blocks in order to allow for reading past unknown animated properties
							var propertyBlock = _ReadNextBlock(reader, function(err) {actor.error = err;});
							propertyReader = propertyBlock.reader;
							propertyType = propertyBlock.type;
						}
						else
						{
							propertyReader = reader;
							propertyType = reader.readUint8();	
						}
						
						var validProperty = false;
						switch(propertyType)
						{
							case AnimatedProperty.Properties.PosX:
							case AnimatedProperty.Properties.PosY:
							case AnimatedProperty.Properties.ScaleX:
							case AnimatedProperty.Properties.ScaleY:
							case AnimatedProperty.Properties.Rotation:
							case AnimatedProperty.Properties.Opacity:
							case AnimatedProperty.Properties.DrawOrder:
							case AnimatedProperty.Properties.Length:
							case AnimatedProperty.Properties.VertexDeform:
							case AnimatedProperty.Properties.IKStrength:
								validProperty = true;
								break;
							default:
								break;
						}
						if(!validProperty)
						{
							continue;
						}
						var animatedProperty = new AnimatedProperty(propertyType);
						animatedNode._Properties.push(animatedProperty);

						var keyFrameCount = propertyReader.readUint16();
						var lastKeyFrame = null;
						for(var k = 0; k < keyFrameCount; k++)
						{
							var keyFrame = new KeyFrame();

							keyFrame._Time = propertyReader.readFloat64();

							// On newer version we write the interpolation first.
							if(actor.dataVersion >= 11)
							{
								var hasInterpolation = propertyType !== AnimatedProperty.Properties.DrawOrder;
								if(hasInterpolation)
								{
									keyFrame._Type = propertyReader.readUint8();
									switch(keyFrame._Type)
									{
										case KeyFrame.Type.Asymmetric:
										case KeyFrame.Type.Mirrored:
										case KeyFrame.Type.Disconnected:
											keyFrame._InFactor = propertyReader.readFloat64();
											keyFrame._InValue = propertyReader.readFloat32();
											keyFrame._OutFactor = propertyReader.readFloat64();
											keyFrame._OutValue = propertyReader.readFloat32();
											break;

										case KeyFrame.Type.Hold:
											keyFrame._InFactor = propertyReader.readFloat64();
											keyFrame._InValue = propertyReader.readFloat32();
											break;

										default:
											keyFrame._InValue = keyFrame._Value;
											keyFrame._OutValue = keyFrame._Value;
											break;
									}
								}
							}

							if(propertyType === AnimatedProperty.Properties.DrawOrder)
							{
								var orderedImages = propertyReader.readUint16();
								var orderValue = [];
								for(var l = 0; l < orderedImages; l++)
								{
									var idx = propertyReader.readUint16();
									var order = propertyReader.readUint16();
									orderValue.push({
										nodeIdx:idx,
										value:order
									});
								}
								keyFrame._Value = orderValue;
							}
							else if(propertyType === AnimatedProperty.Properties.VertexDeform)
							{
								keyFrame._Value = new Float32Array(node._NumVertices * 2);
								node.hasVertexDeformAnimation = true;
								propertyReader.readFloat32Array(keyFrame._Value);
							}
							else
							{
								keyFrame._Value = propertyReader.readFloat32();
							}
							if(actor.dataVersion === 1)
							{
								keyFrame._Type = propertyReader.readUint8();
								switch(keyFrame._Type)
								{
									case KeyFrame.Type.Asymmetric:
									case KeyFrame.Type.Mirrored:
									case KeyFrame.Type.Disconnected:
										keyFrame._InFactor = propertyReader.readFloat64();
										keyFrame._InValue = propertyReader.readFloat32();
										keyFrame._OutFactor = propertyReader.readFloat64();
										keyFrame._OutValue = propertyReader.readFloat32();
										break;

									case KeyFrame.Type.Hold:
										keyFrame._InFactor = propertyReader.readFloat64();
										keyFrame._InValue = propertyReader.readFloat32();
										break;

									default:
										keyFrame._InValue = keyFrame._Value;
										keyFrame._OutValue = keyFrame._Value;
										break;
								}
							}
							else
							{
								switch(keyFrame._Type)
								{
									case KeyFrame.Type.Asymmetric:
									case KeyFrame.Type.Mirrored:
									case KeyFrame.Type.Disconnected:
									case KeyFrame.Type.Hold:
										break;

									default:
										keyFrame._InValue = keyFrame._Value;
										keyFrame._OutValue = keyFrame._Value;
										break;
								}
							}
							if(propertyType === AnimatedProperty.Properties.DrawOrder)
							{
								// Always hold draw order.
								keyFrame._Type = KeyFrame.Type.Hold;
								//console.log("DRAW ORDER TYPE SHOULD BE HOLD", keyFrame._Type);
							}
							else if(propertyType === AnimatedProperty.Properties.VertexDeform)
							{
								keyFrame._Type = KeyFrame.Type.Linear;
							}

							if(lastKeyFrame)
							{
								lastKeyFrame.setNext(keyFrame);
							}
							animatedProperty._KeyFrames.push(keyFrame);
							lastKeyFrame = keyFrame;
						}
						if(lastKeyFrame)
						{
							lastKeyFrame.setNext(null);
						}
					}
				}
			}

			if(actor.dataVersion == 1)
			{
				animation._FPS  = reader.readUint8();
			}
			animation._DisplayStart = reader.readFloat32();
			animation._DisplayEnd = reader.readFloat32();
			//animation._DisplayStart = 0;
			//animation._DisplayEnd = 50/60;
		}
	}

	function _ReadAnimationsBlock(actor, reader)
	{
		var animationsCount = reader.readUint16();
		var actorNodes = actor._Nodes;
		var block = null;
		while((block=_ReadNextBlock(reader, function(err) {actor.error = err;})) !== null)
		{
			switch(block.type)
			{
				case _BlockTypes.Animation:
					_ReadAnimationBlock(actor, block.reader);
					break;
			}
		};
	}

	function _BuildJpegAtlas(atlas, img, imga, callback)
	{
		var canvas = document.createElement("canvas");
		canvas.width = img.width;
        canvas.height = img.height;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, img.width, img.height);
        var imageDataRGB = ctx.getImageData(0,0,canvas.width, canvas.height);
        var dataRGB = imageDataRGB.data;

        var canvasAlpha = document.createElement("canvas");
		canvasAlpha.width = img.width;
        canvasAlpha.height = img.height;
        var actx = canvasAlpha.getContext('2d');
        actx.drawImage(imga, 0, 0, imga.width, imga.height);

        var imageDataAlpha = actx.getImageData(0,0,canvasAlpha.width, canvasAlpha.height);
        var dataAlpha = imageDataAlpha.data;

        var pixels = dataAlpha.length/4;
        var widx = 3;

        for(var j = 0; j < pixels; j++)
        {
            dataRGB[widx] = dataAlpha[widx-1];
            widx+=4;
        }
        ctx.putImageData(imageDataRGB, 0, 0);

        var img = new Image();
		img.src = canvas.toDataURL();
		img.onload = function()
		{
			atlas.img = this;
			callback();
		};
	}

	function _JpegAtlas(dataRGB, dataAlpha, callback)
	{
		var _This = this;
		var img = document.createElement("img");
		var c = 0;
		img.onload = function()
		{
			c++;
			if(c==2)
			{
				_BuildJpegAtlas(_This, img, imga, callback);
			}
		};
		
		var imga = document.createElement("img");
		imga.onload = function()
		{
			c++;
			if(c==2)
			{
				_BuildJpegAtlas(_This, img, imga, callback);
			}
		};

		img.src = URL.createObjectURL(dataRGB);
		imga.src = URL.createObjectURL(dataAlpha);
	}

	function _ReadAtlasesBlock(actor, reader, callback)
	{
		// Read atlases.
		var numAtlases = reader.readUint16();

		var waitCount = 0;
		var loadedCount = 0;
		function loaded()
		{
			loadedCount++;
			if(loadedCount === waitCount)
			{
				callback();
			}
		}

		for(var i = 0; i < numAtlases; i++)
		{
			var size = reader.readUint32();
			var atlasDataRGB = new Uint8Array(size);
			reader.readRaw(atlasDataRGB, atlasDataRGB.length);

			var size = reader.readUint32();
			var atlasDataAlpha = new Uint8Array(size);
			reader.readRaw(atlasDataAlpha, atlasDataAlpha.length);

			var rgbSrc = new Blob([atlasDataRGB], {type: "image/jpeg"});
			var alphaSrc = new Blob([atlasDataAlpha], {type: "image/jpeg"});

			waitCount++;
			var atlas = new _JpegAtlas(rgbSrc, alphaSrc, loaded);

			actor._Atlases.push(atlas);//new Blob([atlasDataRGB], {type: "image/jpeg"}));
		}

		// Return true if we are waiting for atlases
		return waitCount !== loadedCount;
	}

	function _ReadShot(data, callback)
	{
		var reader = new BinaryReader(new Uint8Array(data));
		// Check signature
		if(reader.readUint8() !== 78 || reader.readUint8() !== 73 || reader.readUint8() !== 77 || reader.readUint8() !== 65)
		{
			console.log("Bad nima signature.");
			callback(null);
		}

		var version = reader.readUint32();
		var actor = new Actor();
		actor.dataVersion = version === _FirstVersion ? 1 : version;
		var block = null;
		var waitForAtlas = false;
		while((block=_ReadNextBlock(reader, function(err) {actor.error = err;})) !== null)
		{
			switch(block.type)
			{
				case _BlockTypes.Nodes:
					_ReadNodesBlock(actor, block.reader);
					break;
				case _BlockTypes.View:
					block.reader.readFloat32Array(actor._ViewCenter);
					actor._ViewWidth = block.reader.readFloat32();
					actor._ViewHeight = block.reader.readFloat32();
					break;
				case _BlockTypes.Animations:
					_ReadAnimationsBlock(actor, block.reader);
					break;
				case _BlockTypes.Atlases:

					if(_ReadAtlasesBlock(actor, block.reader, function()
						{
							callback(actor);
						}))
					{
						waitForAtlas = true;
					}
					break;
			}
		}
		if(!waitForAtlas)
		{
			callback(actor);
		}
	}

	function _ReadActorNode(reader, node)
	{
		node._Name = reader.readString();
		node._ParentIdx = reader.readUint16();
		reader.readFloat32Array(node._Translation);
		node._Rotation = reader.readFloat32();
		reader.readFloat32Array(node._Scale);
		node._Opacity = reader.readFloat32();

		return node;
	}

	function _ReadActorBone(reader, node)
	{
		_ReadActorNode(reader, node);
		node._Length = reader.readFloat32();

		return node;
	}

	function _ReadActorRootBone(reader, node)
	{
		_ReadActorNode(reader, node);

		return node;
	}

	function _ReadActorIKTarget(reader, node)
	{
		_ReadActorNode(reader, node);

		node._Order = reader.readUint16();
		node._Strength = reader.readFloat32();
		node._InvertDirection = reader.readUint8() === 1;

		var numInfluencedBones = reader.readUint8();
		if(numInfluencedBones > 0)
		{
			node._InfluencedBones = [];

			for(var i = 0; i < numInfluencedBones; i++)
			{
				node._InfluencedBones.push(reader.readUint16());
			}
		}

		return node;
	}

	function _ReadActorImage(reader, node)
	{
		_ReadActorNode(reader, node);
		var isVisible = reader.readUint8();
		if(isVisible)
		{
			node._BlendMode = reader.readUint8();
			node._DrawOrder = reader.readUint16();
			node._AtlasIndex = reader.readUint8();

			var numConnectedBones = reader.readUint8();
			if(numConnectedBones > 0)
			{
				node._ConnectedBones = [];
				for(var i = 0; i < numConnectedBones; i++)
				{
					var bind = mat2d.create();
					var nodeIndex = reader.readUint16();
					reader.readFloat32Array(bind);

					node._ConnectedBones.push({
						nodeIndex:nodeIndex,
						bind:bind,
						ibind:mat2d.invert(mat2d.create(), bind)
					});
				}

				// Read the final override parent world.
				var overrideWorld = mat2d.create();
				reader.readFloat32Array(overrideWorld);
				mat2d.copy(node._WorldTransform, overrideWorld);
				node._OverrideWorldTransform = true;
			}

			var numVertices = reader.readUint32();
			var vertexStride = numConnectedBones > 0 ? 12 : 4;
			
			node._NumVertices = numVertices;
			node._VertexStride = vertexStride;
			node._Vertices = new Float32Array(numVertices * vertexStride);
			reader.readFloat32Array(node._Vertices);

			var numTris = reader.readUint32();
			node._Triangles = new Uint16Array(numTris * 3);
			reader.readUint16Array(node._Triangles);
		}

		return node;
	}

	return ActorLoader;
}());