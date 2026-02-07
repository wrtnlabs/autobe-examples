import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteTodoAppSystemSettingsSettingKey(props: {
  settingKey: string;
}): Promise<void> {
  const { settingKey } = props;
  const existing = await MyGlobal.prisma.todo_app_system_settings.findUnique({
    where: {
      key: settingKey,
    },
  });
  if (!existing) {
    throw new HttpException("System configuration not found", 404);
  }
  await MyGlobal.prisma.todo_app_system_settings.delete({
    where: {
      id: existing.id,
    },
  });
}
