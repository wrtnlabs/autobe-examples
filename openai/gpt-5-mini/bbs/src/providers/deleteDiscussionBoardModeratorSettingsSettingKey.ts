import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteDiscussionBoardModeratorSettingsSettingKey(props: {
  moderator: ModeratorPayload;
  settingKey: string;
}): Promise<void> {
  const { moderator, settingKey } = props;

  // Use moderator parameter for authorization context
  if (!moderator || !moderator.id) {
    throw new HttpException("Unauthorized", 403);
  }

  // Fetch the setting by its unique business key
  const setting = await MyGlobal.prisma.discussion_board_settings.findUnique({
    where: { key: settingKey },
  });

  if (!setting) {
    throw new HttpException("Not Found", 404);
  }

  if (setting.deleted_at !== null) {
    throw new HttpException("Conflict: Setting already deleted", 409);
  }

  const now = toISOStringSafe(new Date());

  try {
    await MyGlobal.prisma.$transaction(async (tx) => {
      // Soft-delete the setting (mark deleted_at and deactivate)
      await tx.discussion_board_settings.update({
        where: { key: settingKey },
        data: {
          deleted_at: now,
          is_active: false,
          updated_at: now,
        },
      });

      // Record moderation audit for compliance
      await tx.discussion_board_moderation_audit.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          moderation_action_id: null,
          report_id: null,
          actor_moderator_id: moderator.id,
          event_type: "settings.delete",
          event_payload: JSON.stringify({
            key: settingKey,
            previous: {
              value: setting.value,
              is_active: setting.is_active,
              description: setting.description,
            },
          }),
          occurred_at: now,
        },
      });

      // Record a system audit log for operational tracing
      await tx.discussion_board_audit_logs.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          event_type: "discussion_board.settings.deleted",
          event_timestamp: now,
          resource_type: "discussion_board_settings",
          resource_id: setting.id,
          actor_type: "moderator",
          actor_id: moderator.id,
          metadata: JSON.stringify({
            key: settingKey,
            previous: {
              value: setting.value,
              is_active: setting.is_active,
              description: setting.description,
            },
          }),
          created_at: now,
          updated_at: now,
        },
      });
    });
  } catch (err) {
    // Unexpected database or transaction error
    throw new HttpException("Internal Server Error", 500);
  }
}
