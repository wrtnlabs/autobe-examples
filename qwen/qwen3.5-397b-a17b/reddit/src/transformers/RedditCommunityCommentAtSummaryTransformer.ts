import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCommunityMemberAtSummaryTransformer } from "./RedditCommunityMemberAtSummaryTransformer";
import { RedditCommunityPostAtSummaryTransformer } from "./RedditCommunityPostAtSummaryTransformer";

export namespace RedditCommunityCommentAtSummaryTransformer {
  export type Payload = Prisma.reddit_community_commentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        content: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: RedditCommunityMemberAtSummaryTransformer.select(),
        post: RedditCommunityPostAtSummaryTransformer.select(),
        parent: {
          select: {
            id: true,
          },
        } satisfies Prisma.reddit_community_commentsFindManyArgs,
        replies: {
          select: {
            id: true,
          },
        } satisfies Prisma.reddit_community_commentsFindManyArgs,
        votes: {
          select: {
            value: true,
          },
        } satisfies Prisma.reddit_community_comment_votesFindManyArgs,
        reports: {
          select: {
            id: true,
          },
        } satisfies Prisma.reddit_community_report_of_commentsFindManyArgs,
      },
    } satisfies Prisma.reddit_community_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityComment.ISummary> {
    return {
      id: input.id,
      author: await RedditCommunityMemberAtSummaryTransformer.transform(
        input.member,
      ),
      content: input.content,
      voteScore: input.votes.reduce((sum, vote) => sum + vote.value, 0),
      createdAt: input.created_at.toISOString(),
      repliesCount: input.replies.length,
      post: await RedditCommunityPostAtSummaryTransformer.transform(input.post),
    } satisfies IRedditCommunityComment.ISummary;
  }
}
