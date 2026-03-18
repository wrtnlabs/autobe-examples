import { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformPostVoteTransformer {
  export type Payload = Prisma.community_platform_post_votesGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformPostVote> {
    return {
      id: input.id,
      communityPlatformPostId: input.community_platform_post_id,
      voterId: input.voter_id,
      voteValue: input.vote_value,
      votedAt: input.voted_at.toISOString(),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
  export function select() {
    return {
      select: {
        id: true,
        community_platform_post_id: true,
        voter_id: true,
        vote_value: true,
        voted_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        post: { select: { id: true } },
        voter: { select: { id: true } },
      },
    } satisfies Prisma.community_platform_post_votesFindManyArgs;
  }
}
