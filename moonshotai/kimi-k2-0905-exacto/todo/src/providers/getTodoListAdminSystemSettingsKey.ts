import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemSetting";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getTodoListAdminSystemSettingsKey(props: {
  admin: AdminPayload;
  key: string;
}): Promise<ITodoListSystemSetting> {
  const record = await MyGlobal.prisma.todo_list_system_settings.findUnique({
    where: { key: props.key },
  });

  if (!record) {
    throw new HttpException("System setting not found", 404);
  }

  return {
    id: record.id,
    key: record.key,
    value: record.value,
    description: record.description,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
  };
}
