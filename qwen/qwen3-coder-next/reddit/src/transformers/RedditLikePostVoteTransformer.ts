import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostVote";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditLikePostVoteTransformer {
  export type Payload = Prisma.reddit_like_post_votesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        voter_id: true,
        post_id: true,
        value: true,
        created_at: true,
      },
    } satisfies Prisma.reddit_like_post_votesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikePostVote> {
    return {
      id: input.id,
      voter_id: input.voter_id,
      post_id: input.post_id,
      value:
        input.value === 1 || input.value === -1
          ? input.value
          : input.value > 0
            ? 1
            : -1,
      created_at: toISOStringSafe(input.created_at),
    };
  }
}
