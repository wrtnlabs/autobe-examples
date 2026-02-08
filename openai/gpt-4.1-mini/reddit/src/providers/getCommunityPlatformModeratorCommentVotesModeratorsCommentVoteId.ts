import { ICommunityPlatformCommentVoteOfModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVoteOfModerators";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformModeratorCommentVotesModeratorsCommentVoteId(props: {
  moderator: ModeratorPayload;
  commentVoteId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommentVoteOfModerators> {
  const record =
    await MyGlobal.prisma.community_platform_comment_vote_of_moderators.findUnique(
      {
        where: { id: props.commentVoteId },
        select: {
          id: true,
          comment_vote_id: true,
          moderator_id: true,
          vote: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    );
  if (!record || record.deleted_at !== null) {
    throw new HttpException("Comment vote by moderator not found", 404);
  }
  if (record.vote !== 1 && record.vote !== -1) {
    throw new HttpException("Invalid vote value", 400);
  }
  return {
    id: record.id,
    comment_vote_id: record.comment_vote_id,
    moderator_id: record.moderator_id,
    vote: record.vote,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
