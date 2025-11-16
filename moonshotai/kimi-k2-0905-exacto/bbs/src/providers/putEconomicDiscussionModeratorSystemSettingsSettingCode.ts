import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicDiscussionSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSystemSetting";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function putEconomicDiscussionModeratorSystemSettingsSettingCode(props: {
  moderator: ModeratorPayload;
  settingCode: string;
  body: IEconomicDiscussionSystemSetting.IUpdate;
}): Promise<IEconomicDiscussionSystemSetting> {
  // Find the existing setting by its setting_key (settingCode parameter)
  const existing =
    await MyGlobal.prisma.economic_discussion_system_settings.findFirst({
      where: { setting_key: props.settingCode },
    });

  if (!existing) {
    throw new HttpException("System setting not found", 404);
  }

  // Update the setting with the provided values
  const updated =
    await MyGlobal.prisma.economic_discussion_system_settings.update({
      where: { id: existing.id },
      data: {
        setting_value: props.body.setting_value,
        setting_type: props.body.setting_type ?? existing.setting_type,
        display_name: props.body.display_name ?? existing.display_name,
        description: props.body.description ?? existing.description,
        category: props.body.category ?? existing.category,
        is_system_critical:
          props.body.is_system_critical ?? existing.is_system_critical,
        validation_rules:
          props.body.validation_rules ?? existing.validation_rules,
        last_modified_by: props.moderator.id,
        updated_at: toISOStringSafe(new Date()),
      },
    });

  // Return the updated setting with proper date formatting
  return {
    id: updated.id,
    setting_key: updated.setting_key,
    setting_value: updated.setting_value,
    setting_type: typia.assert<
      "string" | "number" | "boolean" | "json" | "datetime"
    >(updated.setting_type),
    display_name: updated.display_name,
    description: updated.description ?? undefined,
    category: updated.category,
    is_system_critical: updated.is_system_critical,
    last_modified_by:
      updated.last_modified_by === null ? undefined : updated.last_modified_by,
    validation_rules: updated.validation_rules ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
