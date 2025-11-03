import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteDiscussionBoardModeratorModeratorsModeratorUsername(props: {
  moderator: ModeratorPayload;
  moderatorUsername: string;
}): Promise<void> {
  const { moderator, moderatorUsername } = props;

  // Verify invoking moderator exists and is active
  const invoking = await MyGlobal.prisma.discussion_board_moderator.findUnique({
    where: { id: moderator.id },
  });
  if (!invoking || invoking.deleted_at !== null) {
    throw new HttpException("Unauthorized", 403);
  }

  // Find target moderator by username
  const target = await MyGlobal.prisma.discussion_board_moderator.findUnique({
    where: { username: moderatorUsername },
  });
  if (!target) throw new HttpException("Not Found", 404);

  // Already removed?
  if (target.deleted_at !== null)
    throw new HttpException("Conflict: moderator already removed", 409);

  // Prevent self-removal
  if (target.id === moderator.id)
    throw new HttpException(
      "Forbidden: cannot remove your own moderator account",
      403,
    );

  // Current timestamp as ISO string
  const now = toISOStringSafe(new Date());

  // Transaction: soft-delete, revoke sessions, create moderation action & audits, create system audit log
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.discussion_board_moderator.update({
      where: { id: target.id },
      data: { deleted_at: now },
    });

    await tx.discussion_board_moderator_sessions.updateMany({
      where: {
        discussion_board_moderator_id: target.id,
        expired_at: null,
      },
      data: { expired_at: now },
    });

    const moderationAction =
      await tx.discussion_board_moderation_actions.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          moderator_id: moderator.id,
          discussion_board_report_id: null,
          action_type: "remove",
          action_reason: `Removed moderator ${target.username} by ${moderator.id}`,
          action_duration_days: null,
          target_type: "moderator",
          target_id: target.id,
          created_at: now,
          effective_from: null,
          effective_until: null,
        },
      });

    await tx.discussion_board_moderation_audit.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        moderation_action_id: moderationAction.id,
        report_id: null,
        actor_moderator_id: moderator.id,
        event_type: "moderation.action.remove",
        event_payload: JSON.stringify({
          moderatorUsername: target.username,
          actorModeratorId: moderator.id,
        }),
        occurred_at: now,
      },
    });

    await tx.discussion_board_audit_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        event_type: "moderation.moderator_removed",
        event_timestamp: now,
        resource_type: "moderator",
        resource_id: target.id,
        actor_type: "moderator",
        actor_id: moderator.id,
        ip: null,
        user_agent: null,
        metadata: JSON.stringify({
          reason: "soft-delete",
          moderatorUsername: target.username,
        }),
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  });
}
