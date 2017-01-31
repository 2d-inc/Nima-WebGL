function BezierAnimationCurve(pos1, control1, control2, pos2)
{
	var y0a = pos1[1]; // initial y
	var x0a = pos1[0]; // initial x 
	var y1a = control1[1];    // 1st influence y   
	var x1a = control1[0];    // 1st influence x 
	var y2a = control2[1];    // 2nd influence y
	var x2a = control2[0];    // 2nd influence x
	var y3a = pos2[1]; // final y 
	var x3a = pos2[0]; // final x 

	var E =   y3a - 3*y2a + 3*y1a - y0a;    
	var F = 3*y2a - 6*y1a + 3*y0a;             
	var G = 3*y1a - 3*y0a;             
	var H =   y0a;

	function yFromT (t, E, F, G, H)
	{
		var y = E*(t*t*t) + F*(t*t) + G*t + H;
		return y;
	}

	function cuberoot(x) 
	{
    	var y = Math.pow(Math.abs(x), 1/3);
    	return x < 0 ? -y : y;
	}	
	// http://stackoverflow.com/questions/27176423/function-to-solve-cubic-equation-analytically

	function solveCubic(a, b, c, d) 
	{
		if (Math.abs(a) < 1e-8) 
		{ 
			// Quadratic case, ax^2+bx+c=0
        	a = b; b = c; c = d;
        	if (Math.abs(a) < 1e-8) 
        	{ 
        		// Linear case, ax+b=0
            	a = b; b = c;
            	if (Math.abs(a) < 1e-8) // Degenerate case
                {
                	return [];
                }
            	return [-b/a];
        	}
			
			var D = b*b - 4*a*c;
        	if (Math.abs(D) < 1e-8)
				return [-b/(2*a)];
			else if (D > 0)
				return [(-b+Math.sqrt(D))/(2*a), (-b-Math.sqrt(D))/(2*a)];
			return [];
		}
		
		// Convert to depressed cubic t^3+pt+q = 0 (subst x = t - b/3a)
		var p = (3*a*c - b*b)/(3*a*a);
		var q = (2*b*b*b - 9*a*b*c + 27*a*a*d)/(27*a*a*a);
		var roots;

		if (Math.abs(p) < 1e-8) 
		{ 
			// p = 0 -> t^3 = -q -> t = -q^1/3
        	roots = [cuberoot(-q)];
    	} 
    	else if (Math.abs(q) < 1e-8) 
    	{ 
    		// q = 0 -> t^3 + pt = 0 -> t(t^2+p)=0
        	roots = [0].concat(p < 0 ? [Math.sqrt(-p), -Math.sqrt(-p)] : []);
    	} 
    	else 
    	{
        	var D = q*q/4 + p*p*p/27;
        	if (Math.abs(D) < 1e-8) 
        	{       // D = 0 -> two roots
            	roots = [-1.5*q/p, 3*q/p];
        	} 
        	else if (D > 0) 
        	{
        		// Only one real root
            	var u = cuberoot(-q/2 - Math.sqrt(D));
            	roots = [u - p/(3*u)];
        	} 
        	else 
        	{
        		// D < 0, three roots, but needs to use complex numbers/trigonometric solution
				var u = 2*Math.sqrt(-p/3);
				var t = Math.acos(3*q/p/u)/3;  // D < 0 implies p < 0 and acos argument in [-1..1]
				var k = 2*Math.PI/3;
				roots = [u*Math.cos(t), u*Math.cos(t-k), u*Math.cos(t-2*k)];
        	}
		}
		
		// Convert back from depressed cubic
		for (var i = 0; i < roots.length; i++)
        {
        	roots[i] -= b/(3*a);
        }
        return roots;
	}

	this.get = function(x)
	{
		//console.log("GET FOR X", x);
		// First solve for t given x.
		var p0 = x0a-x;
		var p1 = x1a-x;
		var p2 = x2a-x;
		var p3 = x3a-x;

		var a = p3 - 3 * p2 + 3 * p1 - p0;
		var b = 3 * p2 - 6 * p1 + 3 * p0;
		var c = 3 * p1 - 3 * p0;
		var d = p0;

		var roots = solveCubic(a, b, c, d);
		var t = 0;
		for(var i = 0; i < roots.length; i++)
		{
			var r = roots[i];
			if(r >= 0.0 && r <= 1.0)
			{
				t = r;
				break;
			}
		}
		return yFromT(t, E, F, G, H);
	};

	// Bounds computation.
	function evalBez(p0, p1, p2, p3, t) 
	{
		var x = p0 * (1 - t) * (1 - t) * (1 - t) + 3 * p1 * t * (1 - t) * (1 - t) + 3 * p2 * t * t * (1 - t) + p3 * t * t * t;
		return x;
	}

	this.getBounds = function()
	{
		if(this.bounds)
		{
			return this.bounds;
		}

		var a = 3 * x3a - 9 * x2a + 9 * x1a - 3 * x0a;
		var b = 6 * x0a - 12 * x1a + 6 * x2a;
		var c = 3 * x1a - 3 * x0a;

		var disc = b * b - 4 * a * c;
		var xl = x0a;
		var xh = x0a;
		if (x3a < xl) xl = x3a;
		if (x3a > xh) xh = x3a;
		if (disc >= 0) 
		{
		    var t1 = (-b + Math.sqrt(disc)) / (2 * a);
		    //alert("t1 " + t1);
		    if (t1 > 0 && t1 < 1) 
		    {
		        var x1 = evalBez(x0a, x1a, x2a, x3a, t1);
		        if (x1 < xl) xl = x1;
		        if (x1 > xh) xh = x1;
		    }

		    var t2 = (-b - Math.sqrt(disc)) / (2 * a);
		    //alert("t2 " + t2);
		    if (t2 > 0 && t2 < 1) 
		    {
		        var x2 = evalBez(x0a, x1a, x2a, x3a, t2);
		        if (x2 < xl) xl = x2;
		        if (x2 > xh) xh = x2;
		    }
		}

		a = 3 * y3a - 9 * y2a + 9 * y1a - 3 * y0a;
		b = 6 * y0a - 12 * y1a + 6 * y2a;
		c = 3 * y1a - 3 * y0a;
		disc = b * b - 4 * a * c;
		var yl = y0a;
		var yh = y0a;
		if (y3a < yl) yl = y3a;
		if (y3a > yh) yh = y3a;
		if (disc >= 0) 
		{
		    var t1 = (-b + Math.sqrt(disc)) / (2 * a);

		    if (t1 > 0 && t1 < 1) 
		    {
		        var y1 = evalBez(y0a, y1a, y2a, y3a, t1);
		        if (y1 < yl) yl = y1;
		        if (y1 > yh) yh = y1;
		    }

		    var t2 = (-b - Math.sqrt(disc)) / (2 * a);

		    if (t2 > 0 && t2 < 1) 
		    {
		        var y2 = evalBez(y0a, y1a, y2a, y3a, t2);
		        if (y2 < yl) yl = y2;
		        if (y2 > yh) yh = y2;
		    }
		}

		this.bounds = [yl, yh];
		return this.bounds;
	};
}