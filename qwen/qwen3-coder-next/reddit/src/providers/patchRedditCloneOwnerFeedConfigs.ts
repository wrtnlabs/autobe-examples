import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneFeedConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFeedConfig";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { RedditCloneFeedConfigTransformer } from "../transformers/RedditCloneFeedConfigTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneOwnerFeedConfigs(props: {
  owner: OwnerPayload;
  body: {
    defaultSortAlgorithm?: string;
    defaultTimeFilter?: string | null;
    homeFeedRequiresAuth?: boolean;
    hotAlgorithmMaxAgeHours?: number | null;
    hotAlgorithmTimeWeight?: number | null;
    hotAlgorithmScoreWeight?: number | null;
    controversialMinVotes?: number | null;
    controversialMaxScoreDeviation?: number | null;
    feedViewCachingEnabled?: boolean;
    feedViewCacheTtlMinutes?: number | null;
    maxPostsPerView?: number;
    paginationOffsetStep?: number;
  };
}): Promise<IRedditCloneFeedConfig> {
  // Load existing configuration
  const existing = await MyGlobal.prisma.reddit_clone_feed_configs.findFirst({
    where: {},
    include: {
      feedViews: true,
    },
  });
  if (!existing) {
    throw new HttpException("Configuration not found", 404);
  }
  // Build update data with validated fields
  const updateData: any = {
    updated_at: toISOStringSafe(new Date()) as string &
      tags.Format<"date-time">,
  };
  // Apply delta updates with validation
  if (props.body.defaultSortAlgorithm !== undefined) {
    if (
      !["hot", "new", "top", "controversial"].includes(
        props.body.defaultSortAlgorithm,
      )
    ) {
      throw new HttpException("Invalid defaultSortAlgorithm value", 400);
    }
    updateData.default_sort_algorithm = props.body.defaultSortAlgorithm;
  }
  if (props.body.defaultTimeFilter !== undefined) {
    if (
      props.body.defaultTimeFilter !== null &&
      !["today", "week", "month", "year", "allTime"].includes(
        props.body.defaultTimeFilter,
      )
    ) {
      throw new HttpException("Invalid defaultTimeFilter value", 400);
    }
    updateData.default_time_filter = props.body.defaultTimeFilter;
  }
  if (props.body.homeFeedRequiresAuth !== undefined) {
    updateData.home_feed_requires_auth = props.body.homeFeedRequiresAuth;
  }
  if (props.body.hotAlgorithmMaxAgeHours !== undefined) {
    updateData.hot_algorithm_max_age_hours = props.body.hotAlgorithmMaxAgeHours;
  }
  if (props.body.hotAlgorithmTimeWeight !== undefined) {
    if (
      props.body.hotAlgorithmTimeWeight !== null &&
      (props.body.hotAlgorithmTimeWeight < 0 ||
        props.body.hotAlgorithmTimeWeight > 1)
    ) {
      throw new HttpException(
        "hotAlgorithmTimeWeight must be between 0.0 and 1.0",
        400,
      );
    }
    updateData.hot_algorithm_time_weight = props.body.hotAlgorithmTimeWeight;
  }
  if (props.body.hotAlgorithmScoreWeight !== undefined) {
    if (
      props.body.hotAlgorithmScoreWeight !== null &&
      (props.body.hotAlgorithmScoreWeight < 0 ||
        props.body.hotAlgorithmScoreWeight > 1)
    ) {
      throw new HttpException(
        "hotAlgorithmScoreWeight must be between 0.0 and 1.0",
        400,
      );
    }
    updateData.hot_algorithm_score_weight = props.body.hotAlgorithmScoreWeight;
  }
  if (props.body.controversialMinVotes !== undefined) {
    updateData.controversial_min_votes = props.body.controversialMinVotes;
  }
  if (props.body.controversialMaxScoreDeviation !== undefined) {
    updateData.controversial_max_score_deviation =
      props.body.controversialMaxScoreDeviation;
  }
  if (props.body.feedViewCachingEnabled !== undefined) {
    updateData.feed_view_caching_enabled = props.body.feedViewCachingEnabled;
  }
  if (props.body.feedViewCacheTtlMinutes !== undefined) {
    updateData.feed_view_cache_ttl_minutes = props.body.feedViewCacheTtlMinutes;
  }
  if (props.body.maxPostsPerView !== undefined) {
    updateData.max_posts_per_view = props.body.maxPostsPerView;
  }
  if (props.body.paginationOffsetStep !== undefined) {
    updateData.pagination_offset_step = props.body.paginationOffsetStep;
  }
  // Update with validated data
  const updated = await MyGlobal.prisma.reddit_clone_feed_configs.update({
    where: { id: existing.id },
    data: updateData,
    include: {
      feedViews: true,
    },
  });
  return await RedditCloneFeedConfigTransformer.transform(updated);
}
