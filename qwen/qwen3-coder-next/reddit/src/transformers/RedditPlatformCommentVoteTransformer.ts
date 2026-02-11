import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditPlatformCommentAtSummaryTransformer } from "./RedditPlatformCommentAtSummaryTransformer";
import { RedditPlatformMemberAtSummaryTransformer } from "./RedditPlatformMemberAtSummaryTransformer";

export namespace RedditPlatformCommentVoteTransformer {
  export type Payload = Prisma.reddit_platform_comment_votesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        vote_type: true,
        created_at: true,
        updated_at: true,
        member: RedditPlatformMemberAtSummaryTransformer.select(),
        comment: RedditPlatformCommentAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_platform_comment_votesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformCommentVote> {
    const voteScore =
      input.vote_type === "UPVOTE"
        ? 1
        : input.vote_type === "DOWNVOTE"
          ? -1
          : 0;
    return {
      id: input.id,
      member: await RedditPlatformMemberAtSummaryTransformer.transform(
        input.member,
      ),
      comment: await RedditPlatformCommentAtSummaryTransformer.transform(
        input.comment,
      ),
      vote_type: input.vote_type,
      vote_score: voteScore,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
