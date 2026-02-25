import { ICommunityPlatformPostVoteOfModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteOfModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformPostVoteOfModeratorAtSummaryTransformer {
  export type Payload =
    Prisma.community_platform_post_vote_of_moderatorsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        community_platform_moderator_id: true,
        community_platform_post_vote_id: true,
        vote_type: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.community_platform_post_vote_of_moderatorsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformPostVoteOfModerator.ISummary> {
    return {
      id: input.id,
      communityPlatformModeratorId: input.community_platform_moderator_id,
      communityPlatformPostVoteId: input.community_platform_post_vote_id,
      voteType: input.vote_type,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
}
