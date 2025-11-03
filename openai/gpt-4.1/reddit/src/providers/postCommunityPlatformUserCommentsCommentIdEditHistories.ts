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

export async function postCommunityPlatformUserCommentsCommentIdEditHistories(props: {
  user: UserPayload;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentEditHistory.ICreate;
}): Promise<ICommunityPlatformCommentEditHistory> {
  // Check if comment exists and user is the author
  const comment = await MyGlobal.prisma.community_platform_comments.findUnique({
    where: { id: props.commentId },
  });
  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }
  if (comment.user_id !== props.user.id) {
    throw new HttpException(
      "You are not authorized to append edit history to this comment",
      403,
    );
  }

  // Prepare data
  const id = v4();
  const created_at = toISOStringSafe(new Date());

  // Insert edit history
  const record =
    await MyGlobal.prisma.community_platform_comment_edit_histories.create({
      data: {
        id: id,
        comment_id: props.commentId,
        editor_user_id: props.user.id,
        editor_user_session_id: props.user.session_id,
        prior_body: props.body.prior_body,
        edit_reason:
          typeof props.body.edit_reason !== "undefined"
            ? props.body.edit_reason
            : null,
        created_at: created_at,
      },
    });

  return {
    id: record.id,
    comment_id: record.comment_id,
    editor_user_id: record.editor_user_id,
    editor_user_session_id: record.editor_user_session_id,
    prior_body: record.prior_body,
    edit_reason:
      typeof record.edit_reason !== "undefined" ? record.edit_reason : null,
    created_at: toISOStringSafe(record.created_at),
  };
}
