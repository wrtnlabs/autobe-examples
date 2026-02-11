import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformPopularFeedCach } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPopularFeedCach";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditPlatformPopularFeedCachTransformer {
  export type Payload = Prisma.reddit_platform_popular_feed_cachesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        feed_type: true,
        sort_method: true,
        time_filter: true,
        community_id: true,
        cache_data: true,
        version: true,
        expires_at: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.reddit_platform_popular_feed_cachesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformPopularFeedCach> {
    return {
      id: input.id,
      feed_type: input.feed_type,
      sort_method: input.sort_method,
      time_filter: input.time_filter ?? undefined,
      community_id: input.community_id ?? undefined,
      cache_data: input.cache_data,
      version: input.version,
      expires_at: input.expires_at.toISOString(),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
