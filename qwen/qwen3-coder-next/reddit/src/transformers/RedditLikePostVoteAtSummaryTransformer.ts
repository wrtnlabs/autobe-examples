import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostVote";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditLikePostVoteAtSummaryTransformer {
  export type Payload = Prisma.reddit_like_post_votesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        post: {
          select: {
            id: true,
          },
        },
        value: true,
        created_at: true,
        voter: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.reddit_like_post_votesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikePostVote.ISummary> {
    return {
      id: input.id,
      post_id: input.post.id,
      value: typia.assert<1 | -1>(input.value),
      created_at: toISOStringSafe(input.created_at),
    };
  }
}
