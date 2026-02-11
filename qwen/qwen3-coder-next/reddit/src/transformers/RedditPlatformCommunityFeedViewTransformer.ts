import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformCommunityFeedView } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityFeedView";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditPlatformCommunityAtSummaryTransformer } from "./RedditPlatformCommunityAtSummaryTransformer";

export namespace RedditPlatformCommunityFeedViewTransformer {
  export type Payload = Prisma.reddit_platform_community_feed_viewsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        user_agent: true,
        referrer: true,
        view_duration_seconds: true,
        posts_viewed_count: true,
        scroll_depth_percent: true,
        pagination_page: true,
        is_authenticated: true,
        ip_address: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        community: {
          select: {
            id: true,
            name: true,
            description: true,
            icon_url: true,
            subscriber_count: true,
          },
        },
      },
    } satisfies Prisma.reddit_platform_community_feed_viewsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformCommunityFeedView> {
    return {
      id: input.id,
      community: await RedditPlatformCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      userAgent: input.user_agent ?? undefined,
      referrer: input.referrer ?? undefined,
      viewDurationSeconds: input.view_duration_seconds ?? undefined,
      postsViewedCount: input.posts_viewed_count ?? undefined,
      scrollDepthPercent: input.scroll_depth_percent ?? undefined,
      paginationPage: input.pagination_page ?? undefined,
      isAuthenticated: input.is_authenticated,
      ipAddress: input.ip_address ?? undefined,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at ? input.deleted_at.toISOString() : null,
    };
  }
}
