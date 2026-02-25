import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneCommunityAtSummaryTransformer } from "./RedditCloneCommunityAtSummaryTransformer";
import { RedditCloneMemberAtSummaryTransformer } from "./RedditCloneMemberAtSummaryTransformer";

export namespace RedditCloneContentPostAtSummaryTransformer {
  export type Payload = Prisma.reddit_clone_content_postsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        type: true,
        title: true,
        content: true,
        image_url: true,
        vote_score: true,
        comment_count: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        author: {
          select: {
            id: true,
            username: true,
            display_name: true,
            avatar_url: true,
          },
        },
        community: {
          select: {
            id: true,
            name: true,
            description: true,
            icon_url: true,
            subscriber_count: true,
            created_at: true,
            updated_at: true,
            owner: {
              select: {
                id: true,
                username: true,
                display_name: true,
                avatar_url: true,
              },
            },
            subscriptionCommunities: true,
            redditCloneOwner: true,
            redditCloneCommunityModerators: true,
            redditCloneCommunityBans: true,
            posts: true,
            contentSubscriptionCommunities: true,
            redditCloneModeratorAssignments: true,
            redditCloneBanRecords: true,
          },
        },
      },
    } satisfies Prisma.reddit_clone_content_postsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneContentPost.ISummary> {
    return {
      id: input.id,
      title: input.title,
      author: await RedditCloneMemberAtSummaryTransformer.transform(
        input.author,
      ),
      community: await RedditCloneCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      voteScore: input.vote_score,
      commentCount: input.comment_count,
      viewCount: 0,
      upvoteCount: 0,
      downvoteCount: 0,
      timeAgo: "",
      trendingScore: 0,
      engagementRate: 0,
      created_at: toISOStringSafe(input.created_at),
    };
  }
}
