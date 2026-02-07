import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getTodoAppSystemSettingsSettingKey(props: {
  settingKey: string;
}): Promise<ITodoAppSystemSetting> {
  const setting = await MyGlobal.prisma.todo_app_system_settings.findUnique({
    where: {
      key: props.settingKey,
    },
  });
  if (!setting) {
    throw new HttpException("System setting not found", 404);
  }
  return {
    id: setting.id,
    key: setting.key,
    value: setting.value,
    description: setting.description === null ? undefined : setting.description,
    is_json: setting.is_json,
    created_at: toISOStringSafe(setting.created_at),
    updated_at: toISOStringSafe(setting.updated_at),
  };
}
