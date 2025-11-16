import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemConfig";
import { TodoadminPayload } from "../decorators/payload/TodoadminPayload";

export async function deleteTodoAppTodoAdminSystemConfigsScopeConfigKey(props: {
  todoAdmin: TodoadminPayload;
  scope: string;
  configKey: string;
}): Promise<ITodoAppSystemConfig> {
  // Locate an active (non-deleted) configuration by its business key (scope, key)
  const existing = await MyGlobal.prisma.todo_app_system_configs.findFirst({
    where: {
      scope: props.scope,
      key: props.configKey,
      deleted_at: null,
    },
  });

  if (existing === null) {
    throw new HttpException("Active system configuration not found", 404);
  }

  // Soft-delete by setting deleted_at and marking as inactive while
  // updating the modification timestamp.
  const updated = await MyGlobal.prisma.todo_app_system_configs.update({
    where: {
      id: existing.id,
    },
    data: {
      deleted_at: new Date(),
      is_active: false,
      updated_at: new Date(),
    },
  });

  return {
    id: updated.id,
    scope: updated.scope,
    key: updated.key,
    value: updated.value,
    description: updated.description === null ? undefined : updated.description,
    is_active: updated.is_active,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null ? null : toISOStringSafe(updated.deleted_at),
  };
}
