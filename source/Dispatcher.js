var Dispatcher = (function()
{
	function Dispatcher()
	{
		this._Events = {};
	}

	Dispatcher.prototype.addEventListener = function(event, callback)
	{
		var evt = this._Events[event];
		if(!evt)
		{
			this._Events[event] = evt = [];
		}
		if(evt.indexOf(callback) != -1)
		{
			return;
		}
		evt.push(callback);
	};

	Dispatcher.prototype.removeEventListener = function(event, callback)
	{
		var evt = this._Events[event];
		if(!evt)
		{
			return true;
		}
		for(var i = 0; i < evt.length; i++)
		{
			if(evt[i] === callback)
			{
				evt.splice(i, 1);
				return true;
			}
		}
		return false;
	};

	Dispatcher.prototype.dispatch = function(event, data, extraContext)
	{
		var evt = this._Events[event];
		if(evt)
		{
			for(var i = 0; i < evt.length; i++)
			{
				evt[i].call(this, data, extraContext);
			}
		}
	}

	Dispatcher.subclass = function(other)
	{
		other.prototype.addEventListener = Dispatcher.prototype.addEventListener;
		other.prototype.removeEventListener = Dispatcher.prototype.removeEventListener;
		other.prototype.dispatch = Dispatcher.prototype.dispatch;
	};


	return Dispatcher;
}());