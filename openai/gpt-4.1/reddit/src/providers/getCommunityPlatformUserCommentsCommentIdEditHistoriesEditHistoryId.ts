import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommentEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentEditHistory";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getCommunityPlatformUserCommentsCommentIdEditHistoriesEditHistoryId(props: {
  user: UserPayload;
  commentId: string & tags.Format<"uuid">;
  editHistoryId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommentEditHistory> {
  const { user, commentId, editHistoryId } = props;

  // 1. Fetch the comment and edit history, errors if not found
  const comment =
    await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
      where: { id: commentId },
    });
  const editHistory =
    await MyGlobal.prisma.community_platform_comment_edit_histories.findUniqueOrThrow(
      {
        where: { id: editHistoryId },
      },
    );

  // 2. Ensure the edit history is for the correct comment
  if (editHistory.comment_id !== commentId) {
    throw new HttpException(
      "Edit history does not belong to specified comment",
      404,
    );
  }

  // 3. Author-only access enforced (if not the comment creator, forbidden)
  if (comment.user_id !== user.id) {
    throw new HttpException("Forbidden: Not allowed to access", 403);
  }

  // 4. Map fields, preserve nullable edit_reason, format date-string properly
  return {
    id: editHistory.id,
    comment_id: editHistory.comment_id,
    editor_user_id: editHistory.editor_user_id,
    editor_user_session_id: editHistory.editor_user_session_id,
    prior_body: editHistory.prior_body,
    edit_reason: editHistory.edit_reason,
    created_at: toISOStringSafe(editHistory.created_at),
  };
}
