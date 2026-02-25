import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneFeedConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFeedConfig";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCloneFeedConfigTransformer {
  export type Payload = Prisma.reddit_clone_feed_configsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
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
        feedViews: {
          select: {
            id: true,
          },
        } satisfies Prisma.reddit_clone_feed_viewsFindManyArgs,
      },
    } satisfies Prisma.reddit_clone_feed_configsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneFeedConfig> {
    return {
      id: input.id,
      defaultSortAlgorithm: typia.assert<
        "hot" | "new" | "top" | "controversial"
      >(input.default_sort_algorithm),
      defaultTimeFilter: input.default_time_filter
        ? (input.default_time_filter as
            | "today"
            | "week"
            | "month"
            | "year"
            | "allTime")
        : null,
      homeFeedRequiresAuth: input.home_feed_requires_auth,
      hotAlgorithmMaxAgeHours: input.hot_algorithm_max_age_hours ?? null,
      hotAlgorithmTimeWeight: input.hot_algorithm_time_weight ?? null,
      hotAlgorithmScoreWeight: input.hot_algorithm_score_weight ?? null,
      controversialMinVotes: input.controversial_min_votes ?? null,
      controversialMaxScoreDeviation:
        input.controversial_max_score_deviation ?? null,
      feedViewCachingEnabled: input.feed_view_caching_enabled,
      feedViewCacheTtlMinutes: input.feed_view_cache_ttl_minutes ?? null,
      maxPostsPerView: input.max_posts_per_view,
      paginationOffsetStep: input.pagination_offset_step,
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
    };
  }
}
