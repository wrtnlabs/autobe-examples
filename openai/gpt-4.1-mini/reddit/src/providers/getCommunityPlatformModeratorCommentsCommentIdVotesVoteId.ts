import { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
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

export async function getCommunityPlatformModeratorCommentsCommentIdVotesVoteId(props: {
  moderator: ModeratorPayload;
  commentId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommentVote> {
  const record =
    await MyGlobal.prisma.community_platform_comment_votes.findFirst({
      where: {
        id: props.voteId,
        community_platform_comment_id: props.commentId,
        deleted_at: null,
      },
      select: {
        id: true,
        community_platform_comment_id: true,
        vote_type: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (!record) {
    throw new HttpException("Vote not found", 404);
  }
  return {
    id: record.id,
    community_platform_comment_id: record.community_platform_comment_id,
    vote_type: record.vote_type,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at:
      record.deleted_at === null ? null : toISOStringSafe(record.deleted_at),
  };
}
