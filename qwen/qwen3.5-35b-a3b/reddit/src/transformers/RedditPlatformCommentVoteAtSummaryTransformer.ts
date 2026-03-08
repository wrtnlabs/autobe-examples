import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditPlatformCommentVoteAtSummaryTransformer {
  export type Payload = Prisma.reddit_platform_comment_votesGetPayload<{
    select: {
      id: true;
      vote_type: true;
      created_at: true;
      updated_at: true;
      deleted_at: true;
      member: true;
      comment: true;
    };
  }>;
  export function select() {
    return {
      select: {
        id: true,
        vote_type: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: true,
        comment: true,
      },
    } satisfies Prisma.reddit_platform_comment_votesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformCommentVote.ISummary> {
    return {
      commentId: input.comment.id,
      score: 0,
      upvoteCount: 0,
      downvoteCount: 0,
      userVote: null,
      totalVotes: 0,
    };
  }
}
