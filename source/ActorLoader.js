var ActorLoader = (function ()
{
	var _FirstVersion = 1065353216;
	var _BlockTypes = {
		Components:1,
		ActorNode:2,
		ActorBone:3,
		ActorRootBone:4,
		ActorImage:5,
		View:6,
		Animation:7,
		Animations:8,
		Atlases:9,
		Atlas:10,
		ActorIKTarget:11,
		ActorEvent:12,
		CustomIntProperty:13,
		CustomFloatProperty:14,
		CustomStringProperty:15
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

	function _ReadComponentsBlock(actor, reader)
	{
		var componentCount = reader.readUint16();
		var actorComponents = actor._Components;

		// Guaranteed from the exporter to be in index order.
		var block = null;
		while((block=_ReadNextBlock(reader, function(err) {actor.error = err;})) !== null)
		{
			var component = null;
			switch(block.type)
			{
				case _BlockTypes.CustomIntProperty:
				case _BlockTypes.CustomStringProperty:
				case _BlockTypes.CustomFloatProperty:
					component = _ReadCustomProperty(block.reader, new CustomProperty(), block.type);
					break;
				case _BlockTypes.ActorEvent:
					component = _ReadActorEvent(block.reader, new ActorEvent());
					break;
				case _BlockTypes.ActorNode:
					component = _ReadActorNode(block.reader, new ActorNode());
					break;
				case _BlockTypes.ActorBone:
					component = _ReadActorBone(block.reader, new ActorBone());
					break;
				case _BlockTypes.ActorRootBone:
					component = _ReadActorRootBone(block.reader, new ActorRootBone());
					break;
				case _BlockTypes.ActorImage:
					component = _ReadActorImage(block.reader, new ActorImage());
					break;
				case _BlockTypes.ActorIKTarget:
					component = _ReadActorIKTarget(block.reader, new ActorIKTarget());
					break;
			}
			if(component)
			{
				component._Index = actorComponents.length;
			}
			actorComponents.push(component);
		};

		actor.resolveHierarchy();
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
		var numKeyedComponents = reader.readUint16();
		if(numKeyedComponents > 0)
		{	
			for(var i = 0; i < numKeyedComponents; i++)
			{
				var componentIndex = reader.readUint16();
				var component = actor._Components[componentIndex];
				if(!component)
				{
					// Bad component was loaded, read past the animation data.
 					// Note this only works after version 12 as we can read by the entire set of properties.
 					var props = reader.readUint16();
 					for(var j = 0; j < props; j++)
 					{
 						var propertyBlock = _ReadNextBlock(reader, function(err) {actor.error = err;});
 					}
				}
				else
				{
					var animatedComponent = new AnimatedComponent(componentIndex);
					if(component.constructor === ActorEvent)
					{
						// N.B. ActorEvents currently only keyframe their trigger so we cn optimize them into a separate array.
						animation._TriggerComponents.push(animatedComponent);	
					}
					else
					{
						animation._Components.push(animatedComponent);
					}
					

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
							case AnimatedProperty.Properties.Trigger:
							case AnimatedProperty.Properties.IntProperty:
							case AnimatedProperty.Properties.FloatProperty:
							case AnimatedProperty.Properties.StringProperty:
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
						animatedComponent._Properties.push(animatedProperty);

						var keyFrameCount = propertyReader.readUint16();
						var lastKeyFrame = null;
						for(var k = 0; k < keyFrameCount; k++)
						{
							var keyFrame = new KeyFrame();

							keyFrame._Time = propertyReader.readFloat64();

							// On newer version we write the interpolation first.
							if(actor.dataVersion >= 11)
							{
								switch(propertyType)
								{
									case AnimatedProperty.Properties.StringProperty:
									case AnimatedProperty.Properties.Trigger:
									case AnimatedProperty.Properties.DrawOrder:
										// These do not interpolate.
										break;
									default:
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
										break;
								}
							}

							if(propertyType === AnimatedProperty.Properties.Trigger)
							{
								// No value on keyframe.
							}
							else if(propertyType === AnimatedProperty.Properties.IntProperty)
							{
								keyFrame._Value = propertyReader.readInt32();
							}
							else if(propertyType === AnimatedProperty.Properties.StringProperty)
							{
								keyFrame._Value = propertyReader.readString();
							}
							else if(propertyType === AnimatedProperty.Properties.DrawOrder)
							{
								var orderedImages = propertyReader.readUint16();
								var orderValue = [];
								for(var l = 0; l < orderedImages; l++)
								{
									var idx = propertyReader.readUint16();
									var order = propertyReader.readUint16();
									orderValue.push({
										componentIdx:idx,
										value:order
									});
								}
								keyFrame._Value = orderValue;
							}
							else if(propertyType === AnimatedProperty.Properties.VertexDeform)
							{
								keyFrame._Value = new Float32Array(component._NumVertices * 2);
								component.hasVertexDeformAnimation = true;
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
				case _BlockTypes.Components:
					_ReadComponentsBlock(actor, block.reader);
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

	function _ReadActorComponent(reader, component)
	{
		component._Name = reader.readString();
		component._ParentIdx = reader.readUint16();
		return component;
	}

	function _ReadCustomProperty(reader, component, type)
	{
		_ReadActorComponent(reader, component);

		switch(type)
		{
			case _BlockTypes.CustomIntProperty:
				component._PropertyType = CustomProperty.Type.Integer;
				component._Value = reader.readInt32();
				break;
			case _BlockTypes.CustomFloatProperty:
				component._PropertyType = CustomProperty.Type.Float;
				component._Value = reader.readFloat32();
				break;
			case _BlockTypes.CustomStringProperty:
				component._PropertyType = CustomProperty.Type.String;
				component._Value = reader.readString();
				break;
		}

		return component;
	}

	function _ReadActorEvent(reader, component)
	{
		_ReadActorComponent(reader, component);
		return component;
	}

	function _ReadActorNode(reader, component)
	{
		_ReadActorComponent(reader, component);

		reader.readFloat32Array(component._Translation);
		component._Rotation = reader.readFloat32();
		reader.readFloat32Array(component._Scale);
		component._Opacity = reader.readFloat32();

		return component;
	}

	function _ReadActorBone(reader, component)
	{
		_ReadActorNode(reader, component);
		component._Length = reader.readFloat32();

		return component;
	}

	function _ReadActorRootBone(reader, component)
	{
		_ReadActorNode(reader, component);

		return component;
	}

	function _ReadActorIKTarget(reader, component)
	{
		_ReadActorNode(reader, component);

		component._Order = reader.readUint16();
		component._Strength = reader.readFloat32();
		component._InvertDirection = reader.readUint8() === 1;

		var numInfluencedBones = reader.readUint8();
		if(numInfluencedBones > 0)
		{
			component._InfluencedBones = [];

			for(var i = 0; i < numInfluencedBones; i++)
			{
				component._InfluencedBones.push(reader.readUint16());
			}
		}

		return component;
	}

	function _ReadActorImage(reader, component)
	{
		_ReadActorNode(reader, component);
		var isVisible = reader.readUint8();
		if(isVisible)
		{
			component._BlendMode = reader.readUint8();
			component._DrawOrder = reader.readUint16();
			component._AtlasIndex = reader.readUint8();

			var numConnectedBones = reader.readUint8();
			if(numConnectedBones > 0)
			{
				component._ConnectedBones = [];
				for(var i = 0; i < numConnectedBones; i++)
				{
					var bind = mat2d.create();
					var componentIndex = reader.readUint16();
					reader.readFloat32Array(bind);

					component._ConnectedBones.push({
						componentIndex:componentIndex,
						bind:bind,
						ibind:mat2d.invert(mat2d.create(), bind)
					});
				}

				// Read the final override parent world.
				var overrideWorld = mat2d.create();
				reader.readFloat32Array(overrideWorld);
				mat2d.copy(component._WorldTransform, overrideWorld);
				component._OverrideWorldTransform = true;
			}

			var numVertices = reader.readUint32();
			var vertexStride = numConnectedBones > 0 ? 12 : 4;
			
			component._NumVertices = numVertices;
			component._VertexStride = vertexStride;
			component._Vertices = new Float32Array(numVertices * vertexStride);
			reader.readFloat32Array(component._Vertices);

			var numTris = reader.readUint32();
			component._Triangles = new Uint16Array(numTris * 3);
			reader.readUint16Array(component._Triangles);
		}

		return component;
	}

	return ActorLoader;
}());