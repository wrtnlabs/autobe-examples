import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCommunityPostVoteAtSummaryTransformer {
  export type Payload = Prisma.reddit_community_post_votesGetPayload<
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
        member: {
          select: {
            id: true,
          },
        } satisfies Prisma.reddit_community_membersFindManyArgs,
        post: {
          select: {
            id: true,
          },
        } satisfies Prisma.reddit_community_postsFindManyArgs,
      },
    } satisfies Prisma.reddit_community_post_votesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityPostVote.ISummary> {
    return {
      id: input.id,
      direction: input.direction,
      created_at: input.created_at.toISOString(),
    };
  }
}
