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

export async function putTodoListAdminSystemSettingsKey(props: {
  admin: AdminPayload;
  key: string;
  body: ITodoListSystemSetting.IUpdate;
}): Promise<ITodoListSystemSetting> {
  // Ensure only admin can update system settings (already validated by route guard)

  // Find the setting by key
  const existing = await MyGlobal.prisma.todo_list_system_settings.findUnique({
    where: { key: props.key },
  });

  if (!existing) {
    throw new HttpException("System setting not found.", 404);
  }

  // Perform update operation
  const updated = await MyGlobal.prisma.todo_list_system_settings.update({
    where: { key: props.key },
    data: {
      value: props.body.value,
      description: Object.prototype.hasOwnProperty.call(
        props.body,
        "description",
      )
        ? props.body.description
        : undefined,
      updated_at: new Date(),
    },
  });

  return {
    id: updated.id,
    key: updated.key,
    value: updated.value,
    description: Object.prototype.hasOwnProperty.call(updated, "description")
      ? updated.description
      : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
