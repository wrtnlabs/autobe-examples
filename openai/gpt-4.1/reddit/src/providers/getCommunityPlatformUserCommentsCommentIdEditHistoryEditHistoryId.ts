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

export async function getCommunityPlatformUserCommentsCommentIdEditHistoryEditHistoryId(props: {
  user: UserPayload;
  commentId: string & tags.Format<"uuid">;
  editHistoryId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommentEditHistory> {
  // Fetch the edit history record for this comment only
  const edit =
    await MyGlobal.prisma.community_platform_comment_edit_history.findFirst({
      where: {
        id: props.editHistoryId,
        comment_id: props.commentId,
      },
    });
  if (!edit) {
    throw new HttpException("Edit history not found for this comment.", 404);
  }
  return {
    id: edit.id,
    comment_id: edit.comment_id,
    snapshot_id: edit.snapshot_id,
    user_session_id: edit.user_session_id,
    edit_reason:
      edit.edit_reason === undefined
        ? undefined
        : edit.edit_reason === null
          ? null
          : edit.edit_reason,
    created_at: toISOStringSafe(edit.created_at),
  };
}
