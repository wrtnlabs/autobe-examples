import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneContentComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentComment";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCloneContentCommentAtVoteResultTransformer {
  export type Payload = Prisma.reddit_clone_content_comment_votesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        vote_value: true,
        created_at: true,
        updated_at: true,
        comment: true,
        member: true,
      },
    } satisfies Prisma.reddit_clone_content_comment_votesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneContentComment.IVoteResult> {
    return {
      voteScore: 0,
      userVote:
        input.vote_value === 1
          ? "upvote"
          : input.vote_value === -1
            ? "downvote"
            : "none",
    };
  }
}
