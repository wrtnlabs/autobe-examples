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

export async function getCommunityPlatformAdminCommentsCommentIdEditHistoriesEditHistoryId(props: {
  admin: AdminPayload;
  commentId: string & tags.Format<"uuid">;
  editHistoryId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommentEditHistory> {
  const record =
    await MyGlobal.prisma.community_platform_comment_edit_histories.findFirst({
      where: {
        id: props.editHistoryId,
        comment_id: props.commentId,
      },
    });
  if (!record) {
    throw new HttpException("Edit history record not found", 404);
  }
  return {
    id: record.id,
    comment_id: record.comment_id,
    editor_user_id: record.editor_user_id,
    editor_user_session_id: record.editor_user_session_id,
    prior_body: record.prior_body,
    edit_reason: record.edit_reason ?? undefined,
    created_at: toISOStringSafe(record.created_at),
  };
}
