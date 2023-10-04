export function etag({ cacheSize, cacheTTL, seed, mimetype }?: {
    cacheSize?: number;
    cacheTTL?: number;
    seed?: any;
    mimetype?: string;
}): ETag;
declare class ETag {
    constructor(cacheSize: any, cacheTTL: any, seed: any, mimetype: any);
    cache: import("tiny-lru").LRU<any>;
    mimetype: any;
    seed: any;
    create(arg: any): string;
    middleware(req: any, res: any, next: any): void;
    hash(arg?: string, mimetype?: string): string;
    register(key: any, arg: any): this;
    unregister(key: any): void;
    valid(headers: any): boolean;
}
export {};
