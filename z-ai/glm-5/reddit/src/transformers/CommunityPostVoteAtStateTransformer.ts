import { ICommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPostVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPostVoteAtStateTransformer {
  export type Payload = Prisma.community_post_votesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        is_upvote: true,
        created_at: true,
        updated_at: true,
        member: {
          select: {
            id: true,
          },
        } satisfies Prisma.community_membersFindManyArgs,
        post: {
          select: {
            id: true,
          },
        } satisfies Prisma.community_postsFindManyArgs,
      },
    } satisfies Prisma.community_post_votesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPostVote.IState> {
    return {
      voteType: input.is_upvote ? "UPVOTE" : "DOWNVOTE",
    } satisfies ICommunityPostVote.IState;
  }
}
