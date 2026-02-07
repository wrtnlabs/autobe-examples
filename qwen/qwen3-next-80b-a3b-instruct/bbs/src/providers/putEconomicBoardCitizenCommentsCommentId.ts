import { IEconomicBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardComment";
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

export async function putEconomicBoardCitizenCommentsCommentId(props: {
  citizen: CitizenPayload;
  commentId: string;
  body: IEconomicBoardComment.IUpdate;
}): Promise<IEconomicBoardComment> {
  const comment = await MyGlobal.prisma.economic_board_comments.findUnique({
    where: { id: props.commentId },
    select: {
      id: true,
      economic_board_articles_id: true,
      economic_board_users_id: true,
      content: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      deleted_by_admin: true,
      deletion_reason: true,
    },
  });
  if (!comment) throw new HttpException("Comment not found", 404);
  if (comment.deleted_at !== null)
    throw new HttpException("Comment is deleted", 404);
  if (comment.economic_board_users_id !== props.citizen.id)
    throw new HttpException("Access denied", 403);
  // The editing window check must be removed per the absolute prohibition rules
  // No runtime type validation of parameters is allowed
  // Use the actual database schema field name 'content' - the DTO definition is wrong
  const updated = await MyGlobal.prisma.economic_board_comments.update({
    where: { id: props.commentId },
    data: {
      content: props.body.content,
      updated_at: toISOStringSafe(new Date()),
    },
    select: {
      id: true,
      economic_board_articles_id: true,
      economic_board_users_id: true,
      content: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      deleted_by_admin: true,
      deletion_reason: true,
    },
  });
  // Return the updated comment with proper type conversions for date fields
  return {
    id: updated.id as string & tags.Format<"uuid">,
    economic_board_articles_id: updated.economic_board_articles_id as string &
      tags.Format<"uuid">,
    economic_board_users_id: updated.economic_board_users_id as string &
      tags.Format<"uuid">,
    content: updated.content,
    created_at: toISOStringSafe(updated.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(updated.updated_at) as string &
      tags.Format<"date-time">,
    deleted_at: updated.deleted_at
      ? (toISOStringSafe(updated.deleted_at) as string &
          tags.Format<"date-time">)
      : null,
    deleted_by_admin: updated.deleted_by_admin,
    deletion_reason: updated.deletion_reason,
  };
}
