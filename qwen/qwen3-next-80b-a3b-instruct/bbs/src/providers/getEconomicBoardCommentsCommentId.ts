import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardComment";

export async function getEconomicBoardCommentsCommentId(props: {
  commentId: string;
}): Promise<IEconomicBoardComment> {
  const comment = await MyGlobal.prisma.economic_board_comments.findUnique({
    where: { id: props.commentId },
  });

  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }

  return {
    id: comment.id,
    body: comment.body,
    created_at: toISOStringSafe(comment.created_at),
    updated_at: toISOStringSafe(comment.updated_at),
    deleted_at: comment.deleted_at
      ? toISOStringSafe(comment.deleted_at)
      : undefined,
    status: typia.assert<"published" | "deleted">(comment.status),
    post_id: comment.post_id,
    citizen_id: comment.citizen_id,
    parent_comment_id: comment.parent_comment_id
      ? comment.parent_comment_id
      : undefined,
    moderator_deleted_id: comment.moderator_deleted_id
      ? comment.moderator_deleted_id
      : undefined,
  };
}
