import { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import { ICommunityPlatformCommentVoteOfModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVoteOfModerator";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformCommentVoteAtSummaryTransformer } from "./CommunityPlatformCommentVoteAtSummaryTransformer";

export namespace CommunityPlatformCommentVoteOfModeratorAtSummaryTransformer {
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
        moderator: CommunityPlatformCommentVoteAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_platform_comment_vote_of_moderatorsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformCommentVoteOfModerator.ISummary> {
    return {
      id: input.id,
      vote: input.vote,
      created_at:
        input.created_at !== null ? toISOStringSafe(input.created_at) : null,
      updated_at:
        input.updated_at !== null ? toISOStringSafe(input.updated_at) : null,
      deleted_at:
        input.deleted_at !== null ? toISOStringSafe(input.deleted_at) : null,
      commentVote:
        await CommunityPlatformCommentVoteAtSummaryTransformer.transform(
          input.commentVote,
        ),
      moderator:
        await CommunityPlatformCommentVoteAtSummaryTransformer.transform(
          input.moderator,
        ),
    } as ICommunityPlatformCommentVoteOfModerator.ISummary;
  }
}
