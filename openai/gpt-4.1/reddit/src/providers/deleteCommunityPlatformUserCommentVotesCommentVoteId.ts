import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteCommunityPlatformUserCommentVotesCommentVoteId(props: {
  user: UserPayload;
  commentVoteId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommentVote> {
  const vote =
    await MyGlobal.prisma.community_platform_comment_votes.findUnique({
      where: { id: props.commentVoteId },
    });
  if (!vote) {
    throw new HttpException("Vote record not found", 404);
  }
  if (vote.community_platform_user_id !== props.user.id) {
    throw new HttpException(
      "Unauthorized: You can only delete your own vote",
      403,
    );
  }
  if (vote.deleted_at !== null) {
    throw new HttpException("Vote is already deleted", 400);
  }
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.community_platform_comment_votes.update(
    {
      where: { id: props.commentVoteId },
      data: { deleted_at: now, updated_at: now },
    },
  );
  return {
    id: updated.id,
    community_platform_user_id: updated.community_platform_user_id,
    community_platform_comment_id: updated.community_platform_comment_id,
    is_upvote: updated.is_upvote,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
