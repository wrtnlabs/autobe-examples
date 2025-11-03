import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSetting";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function putDiscussionBoardModeratorSettingsSettingKey(props: {
  moderator: ModeratorPayload;
  settingKey: string;
  body: IDiscussionBoardSetting.IUpdate;
}): Promise<IDiscussionBoardSetting> {
  const { moderator, settingKey, body } = props;

  // Authorization: verify moderator exists and not soft-deleted
  const moderatorRecord =
    await MyGlobal.prisma.discussion_board_moderator.findFirst({
      where: { id: moderator.id, deleted_at: null },
    });
  if (!moderatorRecord)
    throw new HttpException("Unauthorized: moderator not found", 403);

  // Find the setting by unique key and ensure it's not soft-deleted
  const existing = await MyGlobal.prisma.discussion_board_settings.findFirst({
    where: { key: settingKey, deleted_at: null },
  });
  if (!existing) throw new HttpException("Not Found", 404);

  // Prepare ISO timestamp for update and audit
  const now = toISOStringSafe(new Date());

  // Update only provided fields (inline per coding standards)
  const updated = await MyGlobal.prisma.discussion_board_settings.update({
    where: { key: settingKey },
    data: {
      ...(body.value !== undefined && { value: body.value }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.is_active !== undefined && { is_active: body.is_active }),
      updated_at: now,
    },
  });

  // Record an immutable moderation audit entry for this setting change
  await MyGlobal.prisma.discussion_board_moderation_audit.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      moderation_action_id: null,
      report_id: null,
      actor_moderator_id: moderator.id,
      event_type: "setting.update",
      event_payload: JSON.stringify({
        key: settingKey,
        before: {
          value: existing.value,
          description: existing.description,
          is_active: existing.is_active,
        },
        after: {
          value: updated.value,
          description: updated.description,
          is_active: updated.is_active,
        },
        performed_by: moderator.id,
        occurred_at: now,
      }),
      occurred_at: now,
    },
  });

  // Convert date fields to ISO strings for the API response
  return {
    id: updated.id,
    key: updated.key,
    value: updated.value,
    description: updated.description ?? null,
    is_active: updated.is_active,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
