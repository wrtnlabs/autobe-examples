import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardComment";

export async function getEconomicBoardPostsPostIdCommentsCommentId(props: {
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<IEconomicBoardComment> {
  const comment = await MyGlobal.prisma.economic_board_comments.findUnique({
    where: {
      id: props.commentId,
      post_id: props.postId,
      status: "published",
      deleted_at: null,
    },
  });

  if (!comment) {
    throw new HttpException("Comment not found or inaccessible", 404);
  }

  return {
    id: comment.id,
    body: comment.body,
    created_at: toISOStringSafe(comment.created_at),
    updated_at: toISOStringSafe(comment.updated_at),
    deleted_at:
      comment.deleted_at === null
        ? undefined
        : toISOStringSafe(comment.deleted_at),
    status: typia.assert<"published" | "deleted">(comment.status),
    post_id: comment.post_id,
    citizen_id: comment.citizen_id,
    parent_comment_id:
      comment.parent_comment_id === null
        ? undefined
        : comment.parent_comment_id,
    moderator_deleted_id:
      comment.moderator_deleted_id === null
        ? undefined
        : comment.moderator_deleted_id,
  };
}
