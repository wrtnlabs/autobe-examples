import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import { ICommunityPlatformPostVoteOfModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteOfModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformPostVoteOfModeratorTransformer {
  export type Payload =
    Prisma.community_platform_post_vote_of_moderatorsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        vote_type: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        moderator: {
          select: {
            id: true,
            display_name: true,
          },
        },
        postVote: {
          select: {
            id: true,
            vote_type: true,
            created_at: true,
          },
        },
      },
    } satisfies Prisma.community_platform_post_vote_of_moderatorsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformPostVoteOfModerator> {
    return {
      id: input.id,
      voteType: input.vote_type,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at ? input.deleted_at.toISOString() : null,
      moderator: {
        id: input.moderator.id,
        displayName: input.moderator.display_name,
      },
      postVote: {
        id: input.postVote.id,
        voteType: input.postVote.vote_type,
        createdAt: input.postVote.created_at.toISOString(),
      },
    };
  }
}
