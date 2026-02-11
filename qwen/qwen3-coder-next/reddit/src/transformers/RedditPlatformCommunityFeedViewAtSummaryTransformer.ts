import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunityFeedView } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityFeedView";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditPlatformCommunityFeedViewAtSummaryTransformer {
  export type Payload = {
    community_id: string;
    community: {
      name: string;
    };
    total_views: number;
    avg_view_duration_seconds: number;
    avg_posts_viewed: number;
    avg_scroll_depth_percent: number;
    unique_visitors: number;
    guest_views: number;
    authenticated_views: number;
    created_at: Date;
  };
  export function select() {
    return {
      select: {
        community_id: true,
        community: {
          select: {
            name: true,
          },
        },
      },
    } satisfies Prisma.reddit_platform_community_feed_viewsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformCommunityFeedView.ISummary> {
    return {
      community_id: input.community_id,
      name: input.community.name,
      total_views: input.total_views,
      avg_view_duration_seconds: input.avg_view_duration_seconds,
      avg_posts_viewed: input.avg_posts_viewed,
      avg_scroll_depth_percent: input.avg_scroll_depth_percent,
      unique_visitors: input.unique_visitors,
      guest_views: input.guest_views,
      authenticated_views: input.authenticated_views,
      created_at: input.created_at.toISOString(),
    };
  }
}
