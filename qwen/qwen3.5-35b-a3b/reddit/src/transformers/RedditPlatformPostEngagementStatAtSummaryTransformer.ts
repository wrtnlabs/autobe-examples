import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { IRedditPlatformPostEngagementStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostEngagementStat";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditPlatformPostAtSummaryTransformer } from "./RedditPlatformPostAtSummaryTransformer";

export namespace RedditPlatformPostEngagementStatAtSummaryTransformer {
  export type Payload = Prisma.reddit_platform_post_engagement_statsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        view_count: true,
        upvote_count: true,
        downvote_count: true,
        last_viewed_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        post: RedditPlatformPostAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_platform_post_engagement_statsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformPostEngagementStat.ISummary> {
    return {
      id: input.id,
      view_count: input.view_count,
      upvote_count: input.upvote_count,
      downvote_count: input.downvote_count,
      last_viewed_at: input.last_viewed_at.toISOString(),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      post: await RedditPlatformPostAtSummaryTransformer.transform(input.post),
    };
  }
}
