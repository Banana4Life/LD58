type Vec3 = [number, number, number]


class CubeCoord {
    static readonly CUBE_TO_WORLD = [
        1.0, 1.0 / 2.0,
        0.0, 3.0 / 4.0,
    ]
    static readonly WORLD_TO_CUBE = [
        3.0 / 4.0 * 4.0 / 3.0, -1.0 / 2.0 * 4.0 / 3.0,
        0.0                  , 4.0 / 3.0             ,
    ]

    static readonly ORIGIN     = new CubeCoord(0, 0)
    static readonly NORTH_EAST = new CubeCoord( 0, 1)
    static readonly EAST       = new CubeCoord( 1,  0)
    static readonly SOUTH_EAST = new CubeCoord( 1,  -1)
    static readonly SOUTH_WEST = new CubeCoord(0,  -1)
    static readonly WEST       = new CubeCoord(-1,  0)
    static readonly NORTH_WEST = new CubeCoord( -1, 1)

    static readonly Neighbors = [
        CubeCoord.NORTH_EAST,
        CubeCoord.EAST,
        CubeCoord.SOUTH_EAST,
        CubeCoord.SOUTH_WEST,
        CubeCoord.WEST,
        CubeCoord.NORTH_WEST,
    ] as const

    readonly q: number
    readonly r: number
    readonly s: number

    constructor(q: number, r: number, s?: number) {
        this.q = q
        this.r = r
        if (s === undefined) {
            this.s = -q - r
        } else {
            this.s = s
        }
    }

    get length(): number {
        return (Math.abs(this.q) + Math.abs(this.r) + Math.abs(this.s)) / 2.0
    }

    distance(b: CubeCoord): number {
        return this.minus(b).length
    }

    toWorld(y: number, size: Vec3): Vec3 {
        const [sizeX, _, sizeZ] = size
        return [
            (CubeCoord.CUBE_TO_WORLD[0] * this.q + CubeCoord.CUBE_TO_WORLD[1] * this.r) * sizeX,
            y,
            (CubeCoord.CUBE_TO_WORLD[2] * this.q + CubeCoord.CUBE_TO_WORLD[3] * this.r) * sizeZ,
        ]
    }

    fromWorld(p: Vec3): CubeCoord {
        const [x, _, z] = p
        return new CubeCoord(
            Math.round(CubeCoord.WORLD_TO_CUBE[0] * x + CubeCoord.WORLD_TO_CUBE[1] * z),
            Math.round(CubeCoord.WORLD_TO_CUBE[2] * x + CubeCoord.WORLD_TO_CUBE[3] * z),
        )
    }

    plus(b: CubeCoord): CubeCoord {
        return new CubeCoord(this.q + b.q, this.r + b.r, this.s + b.s)
    }

    minus(b: CubeCoord): CubeCoord {
        return new CubeCoord(this.q - b.q, this.r - b.r, this.s - b.s)
    }

    times(b: number): CubeCoord {
        return new CubeCoord(this.q * b, this.r * b, this.s * b)
    }

    toString(): string {
        return `q: ${this.q}, r: ${this.r}, s: ${this.s}`
    }

    *ringAround(radius: number): Generator<CubeCoord> {
        if (radius == 0) {
            yield this;
        } else {
            let cube = (this.plus(CubeCoord.WEST.times(radius)));
            for (const direction of CubeCoord.Neighbors) {
                for (let i = 0; i < radius; i++) {
                    yield cube;
                    cube = cube.plus(direction);
                }
            }
        }
    }

    *spiralAround(startRing: number = 0, maxRings: number = -1): Generator<CubeCoord> {
        for (let i = 0; i < maxRings || maxRings == -1; ++i) {
            for (const coord of this.ringAround(startRing + i)) {
                yield coord
            }
        }
    }
}