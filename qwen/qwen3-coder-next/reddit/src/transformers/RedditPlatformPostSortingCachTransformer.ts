import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformPostSortingCach } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostSortingCach";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditPlatformPostSortingCachTransformer {
  export type Payload = Prisma.reddit_platform_post_sorting_cachesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        cache_key: true,
        cached_data: true,
        expires_at: true,
        sort_type: true,
        community_id: true,
        time_range: true,
        page_number: true,
        page_size: true,
        created_at: true,
      },
    } satisfies Prisma.reddit_platform_post_sorting_cachesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformPostSortingCach> {
    return {
      cache_key: input.cache_key,
      cached_data: input.cached_data,
      expires_at: input.expires_at.toISOString(),
      sort_type: input.sort_type,
      community_id: input.community_id ?? undefined,
      time_range: input.time_range ?? undefined,
      page_number: input.page_number,
      page_size: input.page_size,
      created_at: input.created_at.toISOString(),
    };
  }
}
