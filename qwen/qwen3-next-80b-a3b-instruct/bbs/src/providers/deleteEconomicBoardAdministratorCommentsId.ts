import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteEconomicBoardAdministratorCommentsId(props: {
  administrator: AdministratorPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Find the comment to delete
  const comment = await MyGlobal.prisma.economic_board_comments.findUnique({
    where: { id: props.id },
    select: {
      id: true,
      article_id: true,
      author_id: true,
      deleted_at: true,
    },
  });
  // 2. Return 404 if comment doesn't exist or is already deleted
  if (!comment || comment.deleted_at !== null) {
    throw new HttpException("Comment not found", 404);
  }
  // 3. Check authorization: must be owner or administrator
  if (comment.author_id !== props.administrator.id) {
    // Only administrators can delete others' comments
    // Assume decorator has already validated admin role
  }
  // 4. Perform soft delete: set deleted_at
  const now = toISOStringSafe(new Date()) as string & tags.Format<"date-time">;
  await MyGlobal.prisma.economic_board_comments.update({
    where: { id: props.id },
    data: {
      deleted_at: now,
    },
  });
  // 5. Log audit event if admin deleted non-owner comment
  if (comment.author_id !== props.administrator.id) {
    await MyGlobal.prisma.economic_board_administrator_audit_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        actor_id: props.administrator.id,
        target_id: comment.author_id,
        action_type: "delete_comment",
        reason: "Admin deleted comment authored by user",
        ip_address: props.administrator.session_id,
        created_at: now,
        updated_at: now,
      },
    });
  }
}
