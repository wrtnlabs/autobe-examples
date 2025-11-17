import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardComment";
import { CitizenPayload } from "../decorators/payload/CitizenPayload";

export async function putEconomicBoardCitizenCommentsCommentId(props: {
  citizen: CitizenPayload;
  commentId: string;
  body: IEconomicBoardComment.IUpdate;
}): Promise<IEconomicBoardComment> {
  const comment = await MyGlobal.prisma.economic_board_comments.findUnique({
    where: { id: props.commentId },
  });

  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }

  if (comment.citizen_id !== props.citizen.id) {
    throw new HttpException(
      "Forbidden: You can only update your own comments",
      403,
    );
  }

  if (comment.deleted_at !== undefined) {
    throw new HttpException(
      "Comment has been deleted and cannot be updated",
      403,
    );
  }

  // Compare ISO strings directly without converting to Date
  const now = new Date().toISOString();
  const twentyFourHoursAgo = new Date(
    Date.now() - 24 * 60 * 60 * 1000,
  ).toISOString();

  if (toISOStringSafe(comment.created_at) < twentyFourHoursAgo) {
    throw new HttpException("Comment editing window expired (24 hours)", 403);
  }

  const updated = await MyGlobal.prisma.economic_board_comments.update({
    where: { id: props.commentId },
    data: {
      body: props.body.body,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    body: updated.body,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null
        ? undefined
        : toISOStringSafe(updated.deleted_at),
    status: typia.assert<"published" | "deleted">(updated.status),
    post_id: updated.post_id,
    citizen_id: updated.citizen_id,
    parent_comment_id:
      updated.parent_comment_id === null
        ? undefined
        : updated.parent_comment_id,
    moderator_deleted_id:
      updated.moderator_deleted_id === null
        ? undefined
        : updated.moderator_deleted_id,
  };
}
