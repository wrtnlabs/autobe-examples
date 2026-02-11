import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformPopularFeedCach } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPopularFeedCach";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformPopularCache(): Promise<IRedditPlatformPopularFeedCach> {
  const cache =
    await MyGlobal.prisma.reddit_platform_popular_feed_caches.findFirst({
      where: { feed_type: "popular" },
    });
  if (!cache) {
    throw new HttpException("Popular feed cache not found", 404);
  }
  return {
    id: cache.id,
    feed_type: cache.feed_type,
    sort_method: cache.sort_method,
    time_filter: cache.time_filter ?? undefined,
    community_id: cache.community_id ?? undefined,
    cache_data: cache.cache_data,
    version: cache.version,
    expires_at: toISOStringSafe(cache.expires_at),
    created_at: toISOStringSafe(cache.created_at),
    updated_at: toISOStringSafe(cache.updated_at),
  };
}
