import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneFeedConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFeedConfig";
import { IRedditCloneFeedView } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFeedView";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCloneFeedViewTransformer {
  export type Payload = Prisma.reddit_clone_feed_viewsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        feed_config_id: true,
        cache_key: true,
        ttl_seconds: true,
        is_stale: true,
        last_refreshed_at: true,
        last_content_updated_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        feedConfig: {
          select: {
            id: true,
            default_sort_algorithm: true,
            default_time_filter: true,
            home_feed_requires_auth: true,
            hot_algorithm_max_age_hours: true,
            hot_algorithm_time_weight: true,
            hot_algorithm_score_weight: true,
            controversial_min_votes: true,
            controversial_max_score_deviation: true,
            feed_view_caching_enabled: true,
            feed_view_cache_ttl_minutes: true,
            max_posts_per_view: true,
            pagination_offset_step: true,
            created_at: true,
            updated_at: true,
          },
        } satisfies Prisma.reddit_clone_feed_configsFindManyArgs,
      },
    } satisfies Prisma.reddit_clone_feed_viewsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneFeedView> {
    return {
      id: input.id,
      feed_config_id: input.feed_config_id,
      cache_key: input.cache_key,
      ttl_seconds: input.ttl_seconds,
      is_stale: input.is_stale,
      last_refreshed_at: input.last_refreshed_at
        ? toISOStringSafe(input.last_refreshed_at)
        : null,
      last_content_updated_at: input.last_content_updated_at
        ? toISOStringSafe(input.last_content_updated_at)
        : null,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      feedConfig: {
        users: {
          total: 0,
          members: 0,
          moderators: 0,
          owners: 0,
          active_24h: 0,
          active_7d: 0,
          active_30d: 0,
        },
        content: {
          posts: 0,
          comments: 0,
          votes: 0,
          votes_per_post: 0,
          comments_per_post: 0,
        },
        communities: {
          total: 0,
          new_24h: 0,
          new_7d: 0,
          subscribers_total: 0,
        },
        moderation: {
          reports_total: 0,
          reports_pending: 0,
          reports_approved: 0,
          reports_dismissed: 0,
          resolution_rate: 0,
          bans_total: 0,
          active_bans: 0,
          moderation_actions_total: 0,
        },
        karma: {
          average: 0,
          median: 0,
          min: 0,
          max: 0,
          users_with_karma: 0,
        },
        generated_at: toISOStringSafe(new Date()),
      },
    };
  }
}
