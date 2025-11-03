import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postAuthModeratorPasswordChange(props: {
  moderator: ModeratorPayload;
  body: IDiscussionBoardModerator.IChangePassword;
}): Promise<IDiscussionBoardModerator> {
  const { moderator, body } = props;

  // Fetch active moderator (reject if soft-deleted)
  const existing = await MyGlobal.prisma.discussion_board_moderator.findFirst({
    where: { id: moderator.id, deleted_at: null },
  });

  if (!existing) {
    throw new HttpException("Not Found", 404);
  }

  // Verify current password against stored hash
  const passwordMatches = await PasswordUtil.verify(
    body.currentPassword,
    existing.password_hash,
  );
  if (!passwordMatches) {
    throw new HttpException("Unauthorized: current password is incorrect", 403);
  }

  // Hash the new password
  const newPasswordHash = await PasswordUtil.hash(body.newPassword);

  // Single consistent timestamp for DB writes and audit
  const now = toISOStringSafe(new Date());

  // Update moderator password_hash and updated_at
  const updated = await MyGlobal.prisma.discussion_board_moderator.update({
    where: { id: moderator.id },
    data: {
      password_hash: newPasswordHash,
      updated_at: now,
    },
  });

  // Revoke all active sessions by setting expired_at to now
  await MyGlobal.prisma.discussion_board_moderator_sessions.updateMany({
    where: {
      discussion_board_moderator_id: moderator.id,
      expired_at: null,
    },
    data: {
      expired_at: now,
    },
  });

  // Create an audit entry for the password change
  await MyGlobal.prisma.discussion_board_moderation_audit.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      actor_moderator_id: moderator.id,
      event_type: "moderation.password_change",
      event_payload: JSON.stringify({ moderator_id: moderator.id }),
      occurred_at: now,
    },
  });

  // Return moderator summary (never include password_hash)
  return {
    id: updated.id as string & tags.Format<"uuid">,
    username: updated.username,
    email: updated.email as string & tags.Format<"email">,
    display_name: updated.display_name ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
