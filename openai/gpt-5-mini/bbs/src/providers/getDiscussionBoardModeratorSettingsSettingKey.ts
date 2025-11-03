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

export async function getDiscussionBoardModeratorSettingsSettingKey(props: {
  moderator: ModeratorPayload;
  settingKey: string;
}): Promise<IDiscussionBoardSetting> {
  const { moderator, settingKey } = props;

  const setting = await MyGlobal.prisma.discussion_board_settings.findFirst({
    where: {
      key: settingKey,
      deleted_at: null,
    },
  });

  if (!setting) {
    throw new HttpException(`Setting with key "${settingKey}" not found`, 404);
  }

  // Prepare timestamp for audit
  const now = toISOStringSafe(new Date());

  // Record audit entry for the read action
  await MyGlobal.prisma.discussion_board_moderation_audit.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      moderation_action_id: null,
      report_id: null,
      actor_moderator_id: moderator.id,
      event_type: "setting.read",
      event_payload: JSON.stringify({ key: settingKey }),
      occurred_at: now,
    },
  });

  return {
    id: setting.id as string & tags.Format<"uuid">,
    key: setting.key,
    value: setting.value,
    description: setting.description ?? null,
    is_active: setting.is_active,
    created_at: toISOStringSafe(setting.created_at),
    updated_at: toISOStringSafe(setting.updated_at),
    deleted_at: setting.deleted_at
      ? toISOStringSafe(setting.deleted_at)
      : undefined,
  };
}
