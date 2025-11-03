import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getCommunityPlatformAdminCommentVotesCommentVoteId(props: {
  admin: AdminPayload;
  commentVoteId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommentVote> {
  const vote =
    await MyGlobal.prisma.community_platform_comment_votes.findUnique({
      where: {
        id: props.commentVoteId,
      },
      select: {
        id: true,
        community_platform_user_id: true,
        community_platform_comment_id: true,
        is_upvote: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (vote === null) {
    throw new HttpException("Comment vote not found", 404);
  }
  return {
    id: vote.id,
    community_platform_user_id: vote.community_platform_user_id,
    community_platform_comment_id: vote.community_platform_comment_id,
    is_upvote: vote.is_upvote,
    created_at: toISOStringSafe(vote.created_at),
    updated_at: toISOStringSafe(vote.updated_at),
    deleted_at:
      vote.deleted_at === null ? null : toISOStringSafe(vote.deleted_at),
  };
}
