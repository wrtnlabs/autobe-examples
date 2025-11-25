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

export async function deleteTodoListAdminSystemSettingsKey(props: {
  admin: AdminPayload;
  key: string;
}): Promise<ITodoListSystemSetting> {
  // Find the setting to be deleted
  const existing = await MyGlobal.prisma.todo_list_system_settings.findUnique({
    where: { key: props.key },
  });

  if (!existing) {
    throw new HttpException(
      `Cannot delete: system setting with key '${props.key}' does not exist.`,
      404,
    );
  }

  // Perform hard delete
  await MyGlobal.prisma.todo_list_system_settings.delete({
    where: { key: props.key },
  });

  // Return deleted record (values from before deletion)
  return {
    id: existing.id,
    key: existing.key,
    value: existing.value,
    description: existing.description ?? undefined,
    version: existing.version,
    created_at: toISOStringSafe(existing.created_at),
    updated_at: toISOStringSafe(existing.updated_at),
  };
}
