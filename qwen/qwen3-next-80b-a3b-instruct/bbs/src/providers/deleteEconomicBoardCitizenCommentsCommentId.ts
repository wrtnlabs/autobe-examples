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

export async function deleteEconomicBoardCitizenCommentsCommentId(props: {
  citizen: CitizenPayload;
  commentId: string;
}): Promise<void> {
  // Query the economic_board_comments table to find the target comment
  const comment = await MyGlobal.prisma.economic_board_comments.findUnique({
    where: { id: props.commentId },
  });
  // If comment doesn't exist, return 404
  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }
  // Check if the authenticated citizen is the author of the comment
  const isAuthor = comment.economic_board_users_id === props.citizen.id;
  // For this endpoint, only citizens can delete their own comments. Administrators are not allowed to delete via this endpoint.
  // Perform authorization: only the comment's original author can delete
  if (!isAuthor) {
    throw new HttpException("Forbidden", 403);
  }
  // Perform soft-delete: update the comment with the current timestamp and mark as author deletion
  await MyGlobal.prisma.economic_board_comments.update({
    where: { id: props.commentId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
      deleted_by_admin: false,
    },
  });
}
