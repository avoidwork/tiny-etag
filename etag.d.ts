export function etag({ cacheSize, cacheTTL, seed, mimetype }?: {
    cacheSize?: number;
    cacheTTL?: number;
    seed?: any;
    mimetype?: string;
}): ETag;
declare class ETag {
    constructor(cacheSize: any, cacheTTL: any, seed: any, mimetype: any);
    cache: {
        first: any;
        items: any;
        last: any;
        max: number;
        size: number;
        ttl: number;
        has(key: any): boolean;
        clear(): any;
        delete(key: any): any;
        evict(bypass?: boolean): any;
        get(key: any): any;
        keys(): string[];
        set(key: any, value: any, bypass?: boolean): any;
    };
    mimetype: any;
    seed: any;
    create(arg: any): string;
    middleware(req: any, res: any, next: any): void;
    hash(arg?: string, mimetype?: string): string;
    register(key: any, arg: any): ETag;
    unregister(key: any): void;
    valid(headers: any): boolean;
}
export {};
