import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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
  const found = await MyGlobal.prisma.todo_list_system_settings.findUnique({
    where: { key: props.key },
  });

  if (!found) {
    throw new HttpException("System setting not found", 404);
  }

  return {
    id: found.id,
    key: found.key,
    value: found.value,
    description: found.description ?? undefined,
    version: found.version,
    created_at: toISOStringSafe(found.created_at),
    updated_at: toISOStringSafe(found.updated_at),
  };
}
