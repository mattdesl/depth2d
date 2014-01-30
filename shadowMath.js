//Uses a simple geometry shadow technique from here:
//http://www.ia.hiof.no/~borres/cgraph/explain/shadow/p-shadow.html

var Vector3 = require('vecmath').Vector3;

//Determine a plane's normal from three of its points
module.exports.calculateNormal = function (p1, p2, p3, out) {
    if (!out)
        out = new Vector3();

    var dx1 = p2.x-p1.x,
        dy1 = p2.y-p1.y,
        dz1 = p2.z-p1.z,
        dx2 = p3.x-p1.x,
        dy2 = p3.y-p1.y,
        dz2 = p3.z-p1.z;

    out.x = dy1*dz2 - dz1*dy2;
    out.y = dz1*dx2 - dx1*dz2;
    out.z = dx1*dy2 - dy1*dx2;

    out.normalize();
    return out;
};

//A method that calculates the parameter called t from a given point on a given
//surface and with a directional vector that equals the direction of the light.
//r is a given point in the plane, p is the point we want to project, n is the
//plane's normal and a is the direction vector of the light.
module.exports.calculateProjection = function (r, p, n, a, out){
    if (!out)
        out = new Vector3();

    //Calculate t
    var t = (n.x*(r.x - p.x) + n.y*(r.y - p.y) + n.z*(r.z - p.z))/
          (n.x*a.x + n.y*a.y + n.z*a.z);

    //Puts t into the equation (1)
    var x1 = p.x + (t * a.x);
    var x2 = p.y + (t * a.y);
    var x3 = p.z + (t * a.z);

    out.x = x1;
    out.y = x2;
    out.z = x3;

    return out;
};