import { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import { ICommunityPlatformCommentVoteOfModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVoteOfModerator";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformCommentVoteAtSummaryTransformer } from "./CommunityPlatformCommentVoteAtSummaryTransformer";

export namespace CommunityPlatformCommentVoteOfModeratorTransformer {
  export type Payload =
    Prisma.community_platform_comment_vote_of_moderatorsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        vote: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        commentVote: CommunityPlatformCommentVoteAtSummaryTransformer.select(),
        moderator: {
          select: {
            id: true,
            // As ISummary is unknown here and no transformer,
            // map id only or minimal fields inline per schema
          },
        },
      },
    } satisfies Prisma.community_platform_comment_vote_of_moderatorsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformCommentVoteOfModerator> {
    return {
      id: input.id,
      vote: input.vote,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
      commentVote:
        await CommunityPlatformCommentVoteAtSummaryTransformer.transform(
          input.commentVote,
        ),
      moderator: {
        id: input.moderator.id,
      } satisfies ICommunityPlatformModerator.ISummary,
    };
  }
}
