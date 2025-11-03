import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommentEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentEditHistory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postCommunityPlatformAdminCommentsCommentIdEditHistories(props: {
  admin: AdminPayload;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentEditHistory.ICreate;
}): Promise<ICommunityPlatformCommentEditHistory> {
  // Verify that the target comment exists
  const comment = await MyGlobal.prisma.community_platform_comments.findUnique({
    where: { id: props.commentId },
    select: { id: true },
  });
  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }

  const now = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.community_platform_comment_edit_histories.create({
      data: {
        id: v4(),
        comment_id: props.commentId,
        editor_user_id: props.admin.id,
        editor_user_session_id: props.admin.session_id,
        prior_body: props.body.prior_body,
        // If edit_reason is omitted, treat as undefined
        edit_reason:
          "edit_reason" in props.body ? props.body.edit_reason : undefined,
        created_at: now,
      },
    });

  return {
    id: created.id,
    comment_id: created.comment_id,
    editor_user_id: created.editor_user_id,
    editor_user_session_id: created.editor_user_session_id,
    prior_body: created.prior_body,
    edit_reason:
      created.edit_reason !== undefined ? created.edit_reason : undefined,
    created_at: toISOStringSafe(created.created_at),
  };
}
