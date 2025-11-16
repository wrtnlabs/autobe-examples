import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getTodoAppAdminSystemSettingsSettingKey(props: {
  admin: AdminPayload;
  settingKey: string;
}): Promise<ITodoAppSystemSetting> {
  // Query the system setting by its unique key
  const setting = await MyGlobal.prisma.todo_app_system_setting.findUnique({
    where: { setting_key: props.settingKey },
  });

  // If setting doesn't exist, return 404
  if (!setting) {
    throw new HttpException(
      `System setting with key '${props.settingKey}' not found`,
      404,
    );
  }

  // Return the setting with proper type conversions for dates and optional fields
  return {
    id: setting.id as string & tags.Format<"uuid">,
    setting_key: setting.setting_key,
    setting_value: setting.setting_value,
    setting_type: setting.setting_type,
    setting_category: setting.setting_category,
    description: setting.description === null ? undefined : setting.description,
    default_value:
      setting.default_value === null ? undefined : setting.default_value,
    min_value: setting.min_value === null ? undefined : setting.min_value,
    max_value: setting.max_value === null ? undefined : setting.max_value,
    is_editable: setting.is_editable,
    created_at: toISOStringSafe(setting.created_at),
    updated_at: toISOStringSafe(setting.updated_at),
  };
}
