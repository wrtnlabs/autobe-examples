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

export async function putTodoAppTodoAdminSystemConfigsScopeConfigKey(props: {
  todoAdmin: TodoadminPayload;
  scope: string;
  configKey: string;
  body: ITodoAppSystemConfig.IUpdate;
}): Promise<ITodoAppSystemConfig> {
  // Authorization is enforced by the TodoadminAuth decorator that produced
  // the `todoAdmin` payload. At this layer we trust that only authenticated
  // todoAdmin actors reach this provider.

  // 1. Locate existing active configuration by (scope, key) with deleted_at null
  const existing = await MyGlobal.prisma.todo_app_system_configs.findFirst({
    where: {
      scope: props.scope,
      key: props.configKey,
      deleted_at: null,
    },
  });

  if (existing === null) {
    throw new HttpException("System configuration not found", 404);
  }

  // 2. Update mutable fields (value, description, is_active).
  //    We intentionally do not touch id, scope, key, created_at, or deleted_at.
  //    updated_at is assumed to be managed by the database layer (e.g., trigger
  //    or default), and we will reflect its new value after the update.
  const updated = await MyGlobal.prisma.todo_app_system_configs.update({
    where: { id: existing.id },
    data: {
      ...(props.body.value !== undefined && {
        value: props.body.value,
      }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.is_active !== undefined && {
        is_active: props.body.is_active,
      }),
    },
  });

  // 3. Map Prisma record back to ITodoAppSystemConfig DTO, converting
  //    timestamp fields to ISO 8601 strings and handling nullability correctly.
  const result: ITodoAppSystemConfig = {
    id: updated.id,
    scope: updated.scope,
    key: updated.key,
    value: updated.value,
    // description is optional and non-null in DTO; represent DB null as undefined
    description: updated.description === null ? undefined : updated.description,
    is_active: updated.is_active,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    // deleted_at is optional and nullable; use null when there is no deletion timestamp
    deleted_at:
      updated.deleted_at === null ? null : toISOStringSafe(updated.deleted_at),
  };

  return result;
}
