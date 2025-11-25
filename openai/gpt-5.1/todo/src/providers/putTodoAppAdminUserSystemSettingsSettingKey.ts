import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function putTodoAppAdminUserSystemSettingsSettingKey(props: {
  adminUser: AdminuserPayload;
  settingKey: string;
  body: ITodoAppSystemSetting.IUpdate;
}): Promise<ITodoAppSystemSetting> {
  if (props.settingKey.length === 0) {
    throw new HttpException("settingKey must not be empty", 400);
  }

  const existing = await MyGlobal.prisma.todo_app_system_settings.findFirst({
    where: {
      key: props.settingKey,
    },
  });

  if (existing === null) {
    throw new HttpException("System setting not found", 404);
  }

  if (existing.deleted_at !== null) {
    throw new HttpException(
      "System setting has been deleted and cannot be updated",
      410,
    );
  }

  const requestBody = props.body;

  const data: Prisma.todo_app_system_settingsUpdateInput = {
    ...(requestBody.value !== undefined ? { value: requestBody.value } : {}),
    ...(requestBody.type !== undefined ? { type: requestBody.type } : {}),
    ...(requestBody.description !== undefined
      ? { description: requestBody.description }
      : {}),
    ...(requestBody.group !== undefined ? { group: requestBody.group } : {}),
    ...(requestBody.enabled !== undefined
      ? { enabled: requestBody.enabled }
      : {}),
  };

  const updated = await MyGlobal.prisma.todo_app_system_settings.update({
    where: {
      id: existing.id,
    },
    data,
  });

  const result: ITodoAppSystemSetting = {
    id: updated.id,
    key: updated.key,
    value: updated.value,
    type: updated.type,
    description: updated.description !== null ? updated.description : null,
    group: updated.group !== null ? updated.group : null,
    enabled: updated.enabled,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null ? toISOStringSafe(updated.deleted_at) : null,
  };

  return result;
}
