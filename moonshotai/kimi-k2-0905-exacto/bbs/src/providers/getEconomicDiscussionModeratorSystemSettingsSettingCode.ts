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

export async function getEconomicDiscussionModeratorSystemSettingsSettingCode(props: {
  moderator: ModeratorPayload;
  settingCode: string;
}): Promise<IEconomicDiscussionSystemSetting> {
  const setting =
    await MyGlobal.prisma.economic_discussion_system_settings.findUnique({
      where: { setting_key: props.settingCode },
    });

  if (!setting) {
    throw new HttpException("System setting not found", 404);
  }

  return {
    id: setting.id as string & tags.Format<"uuid">,
    setting_key: setting.setting_key,
    setting_value: setting.setting_value,
    setting_type: setting.setting_type as
      | "string"
      | "number"
      | "boolean"
      | "json"
      | "datetime",
    display_name: setting.display_name,
    description: setting.description ?? undefined,
    category: setting.category,
    is_system_critical: setting.is_system_critical,
    last_modified_by: setting.last_modified_by ?? undefined,
    validation_rules: setting.validation_rules ?? undefined,
    created_at: toISOStringSafe(setting.created_at),
    updated_at: toISOStringSafe(setting.updated_at),
  };
}
