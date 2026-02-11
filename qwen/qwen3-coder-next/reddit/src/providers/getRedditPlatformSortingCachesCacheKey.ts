import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformPostSortingCach } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostSortingCach";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditPlatformPostSortingCachTransformer } from "../transformers/RedditPlatformPostSortingCachTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformSortingCachesCacheKey(props: {
  cacheKey: string;
}): Promise<IRedditPlatformPostSortingCach> {
  const cache =
    await MyGlobal.prisma.reddit_platform_post_sorting_caches.findUnique({
      where: { cache_key: props.cacheKey },
      ...RedditPlatformPostSortingCachTransformer.select(),
    });
  if (!cache) throw new HttpException("Cache not found", 404);
  return await RedditPlatformPostSortingCachTransformer.transform(cache);
}
