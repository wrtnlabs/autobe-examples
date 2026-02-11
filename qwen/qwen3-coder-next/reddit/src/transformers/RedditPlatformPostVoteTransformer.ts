import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditPlatformPostVoteTransformer {
  export type Payload = Prisma.reddit_platform_post_votesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        user_id: true,
        post_id: true,
        vote_type: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.reddit_platform_post_votesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformPostVote> {
    return {
      id: input.id,
      user_id: input.user_id,
      post_id: input.post_id,
      vote_type: input.vote_type satisfies string as
        | "UPVOTE"
        | "DOWNVOTE"
        | "NONE",
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
    };
  }
}
