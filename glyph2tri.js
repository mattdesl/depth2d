

var poly2tri = require('poly2tri');

function isClockwise(points) {
    var sum = 0;
    for (var i=0; i<points.length-1; i++) {
        sum += (points[i+1].x - points[i].x) * (points[i+1].y + points[i].y);
    }
    return sum > 0;
}

function indexOfPointInList(other, list) {
    for (var i=0; i<list.length; i++) {
        var p = list[i];
        if (p.x == other.x && p.y == other.y)
            return i;
    }
    return -1;
}

function isCollinear(a, b, c) {
    var r = (b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y) ;
    var eps = 0.0000001;
    return Math.abs(r) < eps;
}

function asPointSet(points) {
    var contour = [];
    var jitter = 0.1;
    
    for (var n=0; n<points.length; n++) {
        var x = points[n].x + 0.01;
        var y = points[n].y + 0.01;
                
        var np = new poly2tri.Point(x, y);
        
        if (indexOfPointInList(np, contour) === -1) {
            // if (contour.length > 2) {
            //     var p2x = contour[contour.length-1].x;
            //     var p2y = contour[contour.length-1].y;
                
            //     var p3x = contour[contour.length-2].x;
            //     var p3y = contour[contour.length-2].y;
                
            //     var col = (p3x - x) * (p2y - y) + (p3y - y) * (x - p2x);
            //     var eps = 0.05;
            //     if (col > -eps && col < eps) {
            //            // console.log("colin");
            //            // contour.splice(contour.length-1, 1);
            //            // contour.splice(contour.length-2, 1);
            //            // continue;   
            //            np.x += Math.random()*eps;
            //            np.y += Math.random()*eps;
            //     }
            // }
            if ( (n===0 || n===points.length-1) || !isCollinear(points[n-1], points[n], points[n+1]))
                contour.push(np);
        }
    }
    return contour;
}

module.exports.triangulate = function (glyph) {
    var windingClockwise = false;
    var sweep = null;

    var poly = {holes:[], contour:[]};
    var allTris = [];

    for (var j=0; j<glyph.meshData.length; j++) {
        var points = glyph.meshData[j].vertices;
        
        //check the winding order
        if (j==0) {
            windingClockwise = isClockwise(points);
        }
        
        try {
            var set = asPointSet(points);

            //if the sweep has already been created, maybe we're on a hole?
            if (sweep !== null) {
                var clock = isClockwise(points);
                
                //we have a hole...
                if (windingClockwise !== clock) {
                    sweep.addHole( set );
                    poly.holes.push(points);
                } else {
                    //no hole, so it must be a new shape.
                    //add our last shape
                    
                    sweep.triangulate();
                    allTris = allTris.concat(sweep.getTriangles());

                    //reset the sweep for next shape
                    sweep = new poly2tri.SweepContext(set);
                    poly = {holes:[], contour:points};
                }
            } else {
                sweep = new poly2tri.SweepContext(set);   
                poly = {holes:[], contour:points};
            }
        } catch (e) {
            console.log(e);
            return null;
        }
    }

    //if the sweep is still setup, then triangulate it
    if (sweep !== null) {
        try {
            //fontShape.polygons.push(poly);
            sweep.triangulate();
            allTris = allTris.concat(sweep.getTriangles());
        } catch (e) {
            console.log(e);
            return null;
        }
    }
    return allTris;
}