import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CitizenPayload } from "../decorators/payload/CitizenPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function deleteEconomicBoardCitizenCommentsCommentId(props: {
  citizen: CitizenPayload;
  commentId: string;
}): Promise<void> {
  // Find the comment by ID and author
  const comment = await MyGlobal.prisma.economic_board_comments.findUnique({
    where: {
      id: props.commentId,
      author_id: props.citizen.id,
    },
    select: {
      id: true,
      article_id: true,
      created_at: true,
      deleted_at: true,
    },
  });
  // Validate comment exists and is not already deleted
  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }
  if (comment.deleted_at !== null) {
    throw new HttpException("Comment already deleted", 400);
  }
  // Validate comment created within last 7 days
  const sevenDaysAgo = toISOStringSafe(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  );
  if (comment.created_at.getTime() < new Date(sevenDaysAgo).getTime()) {
    throw new HttpException("Cannot delete comment older than 7 days", 400);
  }
  // Update comment to mark as deleted
  await MyGlobal.prisma.economic_board_comments.update({
    where: { id: props.commentId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
  // Log audit event
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.economic_board_administrator_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      actor_id: props.citizen.id,
      action_type: "COMMENT_DELETED",
      target_id: props.commentId,
      reason: JSON.stringify({
        article_id: comment.article_id,
        reason: "user_deleted",
      }),
      ip_address: "127.0.0.1",
      created_at: now,
      updated_at: now, // Added required updated_at field
    },
  });
}
