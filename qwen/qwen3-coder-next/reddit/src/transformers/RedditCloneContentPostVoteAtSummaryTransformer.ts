import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneContentPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPostVote";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCloneContentPostVoteAtSummaryTransformer {
  export type Payload = Prisma.reddit_clone_content_post_votesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        vote_value: true,
        created_at: true,
        updated_at: true,
        member: true,
        post_id: true,
        post: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.reddit_clone_content_post_votesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneContentPostVote.ISummary> {
    const voteType: "upvote" | "downvote" | "none" =
      input.vote_value === 1
        ? "upvote"
        : input.vote_value === -1
          ? "downvote"
          : "none";
    return {
      voteType: voteType,
      voteScore: input.vote_value satisfies number as number,
      userVote: voteType,
    };
  }
}
