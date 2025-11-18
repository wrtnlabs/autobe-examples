import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function getTodoAppAdminUserSystemSettingsSettingKey(props: {
  adminUser: AdminuserPayload;
  settingKey: string;
}): Promise<ITodoAppSystemSetting> {
  const setting = await MyGlobal.prisma.todo_app_system_settings.findFirst({
    where: {
      key: props.settingKey,
      deleted_at: null,
    },
  });

  if (setting === null) {
    throw new HttpException("System setting not found", 404);
  }

  return {
    id: setting.id,
    key: setting.key,
    value: setting.value,
    type: setting.type,
    description: setting.description === null ? null : setting.description,
    group: setting.group === null ? null : setting.group,
    enabled: setting.enabled,
    created_at: toISOStringSafe(setting.created_at),
    updated_at: toISOStringSafe(setting.updated_at),
    deleted_at:
      setting.deleted_at === null ? null : toISOStringSafe(setting.deleted_at),
  };
}
