import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommentVote";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCloneCommentVoteAtResponseTransformer {
  // 1. Payload type first
  export type Payload = Prisma.reddit_clone_comment_votesGetPayload<
    ReturnType<typeof select>
  >;
  // 2. select() function second
  export function select() {
    return {
      select: {
        id: true,
        vote: true,
        created_at: true,
        updated_at: true,
        member: true,
        comment: true,
      },
    } satisfies Prisma.reddit_clone_comment_votesFindManyArgs;
  }
  // 3. transform() function last
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneCommentVote.IResponse> {
    return {
      voteScore: input.vote, // net votes (upvotes - downvotes)
      userVote:
        input.vote === 1 ? "upvote" : input.vote === -1 ? "downvote" : "none",
    };
  }
}
