import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteEconomicBoardCommentsCommentId(props: {
  commentId: string;
  auth: { id: string & tags.Format<"uuid">; role: string };
}): Promise<void> {
  // Find the comment by its ID
  const comment = await MyGlobal.prisma.economic_board_comments.findUnique({
    where: { id: props.commentId },
  });

  // Return 404 if comment doesn't exist
  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }

  // Check if user is the comment owner (citizen) or moderator
  if (!props.auth) {
    throw new HttpException("Unauthorized", 401);
  }

  // Check if user is the comment owner
  const isOwner = props.auth.id === comment.citizen_id;

  // Check if user is a moderator
  const isModerator = props.auth.role === "moderator";

  // If neither owner nor moderator, deny access
  if (!isOwner && !isModerator) {
    throw new HttpException("Forbidden", 403);
  }

  // Soft delete: set deleted_at to current time and status to deleted
  await MyGlobal.prisma.economic_board_comments.update({
    where: { id: props.commentId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
      status: "deleted",
    },
  });
}
