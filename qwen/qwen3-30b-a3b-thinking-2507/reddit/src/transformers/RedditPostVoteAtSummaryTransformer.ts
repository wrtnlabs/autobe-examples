import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPostVote";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditPostVoteAtSummaryTransformer {
  export type Payload = Prisma.reddit_post_votesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        direction: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        post: true,
        user: true,
      },
    } satisfies Prisma.reddit_post_votesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPostVote.ISummary> {
    return {
      direction: input.direction,
    };
  }
}
