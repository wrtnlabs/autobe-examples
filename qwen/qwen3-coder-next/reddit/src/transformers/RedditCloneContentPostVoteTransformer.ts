import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneContentPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPostVote";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCloneContentPostVoteTransformer {
  //----
  // TYPES
  //----
  export type Payload = Prisma.reddit_clone_content_post_votesGetPayload<
    ReturnType<typeof select>
  >;
  //----
  // SELECT
  //----
  export function select() {
    return {
      select: {
        id: true,
        vote_value: true,
        created_at: true,
        updated_at: true,
        member: true,
        post: true,
      },
    } satisfies Prisma.reddit_clone_content_post_votesFindManyArgs;
  }
  //----
  // TRANSFORM
  //----
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneContentPostVote> {
    return {
      id: input.id,
      vote_value: input.vote_value,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
