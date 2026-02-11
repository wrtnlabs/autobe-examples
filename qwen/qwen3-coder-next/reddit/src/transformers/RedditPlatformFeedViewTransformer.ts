import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformFeedResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFeedResult";
import { IRedditPlatformFeedView } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFeedView";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditPlatformCommunityAtSummaryTransformer } from "./RedditPlatformCommunityAtSummaryTransformer";
import { RedditPlatformFeedResultAtSummaryTransformer } from "./RedditPlatformFeedResultAtSummaryTransformer";
import { RedditPlatformMemberAtSummaryTransformer } from "./RedditPlatformMemberAtSummaryTransformer";

export namespace RedditPlatformFeedViewTransformer {
  export type Payload = Prisma.reddit_platform_feed_viewsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        user: {
          select: RedditPlatformMemberAtSummaryTransformer.select().select,
        },
        feedResult: {
          select: RedditPlatformFeedResultAtSummaryTransformer.select().select,
        },
        community: {
          select: RedditPlatformCommunityAtSummaryTransformer.select().select,
        },
        session_id: true,
        feed_type: true,
        user_agent: true,
        ip_address: true,
        viewed_at: true,
        engagement_duration: true,
        items_viewed: true,
      },
    } satisfies Prisma.reddit_platform_feed_viewsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformFeedView> {
    return {
      id: input.id,
      userId: input.user.id,
      feedResultId: input.feedResult?.id ?? null,
      communityId: input.community?.id ?? null,
      sessionId: input.session_id,
      feedType: input.feed_type,
      userAgent: input.user_agent ?? null,
      ipAddress: input.ip_address ?? null,
      viewedAt: toISOStringSafe(input.viewed_at),
      engagementDuration: input.engagement_duration ?? null,
      itemsViewed: input.items_viewed ?? null,
      user: await RedditPlatformMemberAtSummaryTransformer.transform(
        input.user,
      ),
      feedResult: input.feedResult
        ? await RedditPlatformFeedResultAtSummaryTransformer.transform(
            input.feedResult,
          )
        : null,
      community: input.community
        ? await RedditPlatformCommunityAtSummaryTransformer.transform(
            input.community,
          )
        : null,
    };
  }
}
