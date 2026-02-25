import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneFeedView } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFeedView";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneOwnerFeedViewsFeedViewIdRefresh(props: {
  owner: OwnerPayload;
  feedViewId: string & tags.Format<"uuid">;
}): Promise<IRedditCloneFeedView.IRefreshResponse> {
  // 1. Fetch feed view with configuration
  const feedView =
    await MyGlobal.prisma.reddit_clone_feed_views.findUniqueOrThrow({
      where: { id: props.feedViewId },
      select: {
        id: true,
        feed_config_id: true,
        cache_key: true,
        ttl_seconds: true,
        is_stale: true,
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
        },
      },
    });
  // 2. Verify authorization (already handled by ownerAuthorize)
  // 3. Query current posts based on feed configuration
  const posts = await MyGlobal.prisma.reddit_clone_content_posts.findMany({
    where: {
      deleted_at: null,
    },
    orderBy: [
      // Default to 'new' sorting if algorithm is unspecified
      { created_at: "desc" },
    ],
    take: feedView.feedConfig.max_posts_per_view || 100,
    select: {
      id: true,
      title: true,
      content: true,
      image_url: true,
      vote_score: true,
      comment_count: true,
      created_at: true,
      author_id: true,
      community_id: true,
    },
  });
  // 4. Determine the most recent post timestamp for last_content_updated_at
  const mostRecentPost = posts[0];
  const lastContentUpdated = mostRecentPost
    ? (mostRecentPost.created_at.toISOString() as string &
        tags.Format<"date-time">)
    : null;
  // 5. Update feed_views table
  const now = new Date().toISOString() as string & tags.Format<"date-time">;
  await MyGlobal.prisma.reddit_clone_feed_views.update({
    where: { id: props.feedViewId },
    data: {
      is_stale: false,
      last_refreshed_at: now,
      ...(lastContentUpdated !== null && {
        last_content_updated_at: lastContentUpdated,
      }),
      updated_at: now,
    },
  });
  // 6. Clear old posts and add new sorted posts
  await MyGlobal.prisma.reddit_clone_feed_views_posts.deleteMany({
    where: { feed_view_id: props.feedViewId },
  });
  // Add new posts with positions
  const feedViewPostsData = posts.map((post, index) => ({
    id: v4(),
    feed_view_id: props.feedViewId,
    content_post_id: post.id,
    position: index,
    created_at: now,
    updated_at: now,
  }));
  if (feedViewPostsData.length > 0) {
    await MyGlobal.prisma.reddit_clone_feed_views_posts.createMany({
      data: feedViewPostsData,
    });
  }
  // 7. Return successful refresh confirmation
  return {
    success: "refreshed",
    feedViewId: props.feedViewId,
  };
}
