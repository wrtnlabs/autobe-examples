import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneFeedConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFeedConfig";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneModeratorFeedConfigs(props: {
  moderator: ModeratorPayload;
  body: IRedditCloneFeedConfig.IUpdate;
}): Promise<IRedditCloneFeedConfig> {
  const config =
    await MyGlobal.prisma.reddit_clone_feed_configs.findUniqueOrThrow({
      where: { id: "singleton" },
    });
  const updated = await MyGlobal.prisma.reddit_clone_feed_configs.update({
    where: { id: config.id },
    data: {
      ...(props.body.default_sort_algorithm !== undefined && {
        default_sort_algorithm: props.body.default_sort_algorithm,
      }),
      ...(props.body.default_time_filter !== undefined && {
        default_time_filter: props.body.default_time_filter,
      }),
      ...(props.body.home_feed_requires_auth !== undefined && {
        home_feed_requires_auth: props.body.home_feed_requires_auth,
      }),
      ...(props.body.hot_algorithm_max_age_hours !== undefined && {
        hot_algorithm_max_age_hours: props.body.hot_algorithm_max_age_hours,
      }),
      ...(props.body.hot_algorithm_time_weight !== undefined && {
        hot_algorithm_time_weight: props.body.hot_algorithm_time_weight,
      }),
      ...(props.body.hot_algorithm_score_weight !== undefined && {
        hot_algorithm_score_weight: props.body.hot_algorithm_score_weight,
      }),
      ...(props.body.controversial_min_votes !== undefined && {
        controversial_min_votes: props.body.controversial_min_votes,
      }),
      ...(props.body.controversial_max_score_deviation !== undefined && {
        controversial_max_score_deviation:
          props.body.controversial_max_score_deviation,
      }),
      ...(props.body.feed_view_caching_enabled !== undefined && {
        feed_view_caching_enabled: props.body.feed_view_caching_enabled,
      }),
      ...(props.body.feed_view_cache_ttl_minutes !== undefined && {
        feed_view_cache_ttl_minutes: props.body.feed_view_cache_ttl_minutes,
      }),
      ...(props.body.max_posts_per_view !== undefined && {
        max_posts_per_view: props.body.max_posts_per_view,
      }),
      ...(props.body.pagination_offset_step !== undefined && {
        pagination_offset_step: props.body.pagination_offset_step,
      }),
      updated_at: new Date(),
    },
  });
  return {
    id: updated.id,
    defaultSortAlgorithm: updated.default_sort_algorithm as
      | "hot"
      | "new"
      | "top"
      | "controversial",
    defaultTimeFilter: updated.default_time_filter as
      | "today"
      | "week"
      | "month"
      | "year"
      | "allTime"
      | null,
    homeFeedRequiresAuth: updated.home_feed_requires_auth,
    hotAlgorithmMaxAgeHours: updated.hot_algorithm_max_age_hours ?? null,
    hotAlgorithmTimeWeight: updated.hot_algorithm_time_weight ?? null,
    hotAlgorithmScoreWeight: updated.hot_algorithm_score_weight ?? null,
    controversialMinVotes: updated.controversial_min_votes ?? null,
    controversialMaxScoreDeviation:
      updated.controversial_max_score_deviation ?? null,
    feedViewCachingEnabled: updated.feed_view_caching_enabled,
    feedViewCacheTtlMinutes: updated.feed_view_cache_ttl_minutes ?? null,
    maxPostsPerView: updated.max_posts_per_view,
    paginationOffsetStep: updated.pagination_offset_step,
    createdAt: updated.created_at.toISOString(),
    updatedAt: updated.updated_at.toISOString(),
  };
}
