import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeCommentVotesSum } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommentVotesSum";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditLikeCommentVotesSumTransformer {
  export type Payload = Prisma.reddit_like_comment_votes_sumsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        vote_sum: true,
        upvote_count: true,
        downvote_count: true,
        last_vote_at: true,
      },
    } satisfies Prisma.reddit_like_comment_votes_sumsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikeCommentVotesSum> {
    return {
      vote_sum: input.vote_sum,
      upvote_count: input.upvote_count,
      downvote_count: input.downvote_count,
      last_vote_at: input.last_vote_at?.toISOString() ?? null,
    };
  }
}
