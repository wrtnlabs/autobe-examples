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

export async function getTodoAppTodoAdminSystemConfigsScopeConfigKey(props: {
  todoAdmin: TodoadminPayload;
  scope: string;
  configKey: string;
}): Promise<ITodoAppSystemConfig> {
  const config = await MyGlobal.prisma.todo_app_system_configs.findFirst({
    where: {
      scope: props.scope,
      key: props.configKey,
      is_active: true,
      deleted_at: null,
    },
  });

  if (config === null) {
    throw new HttpException("System configuration not found", 404);
  }

  return {
    id: config.id,
    scope: config.scope,
    key: config.key,
    value: config.value,
    description: config.description ?? undefined,
    is_active: config.is_active,
    created_at: toISOStringSafe(config.created_at),
    updated_at: toISOStringSafe(config.updated_at),
    deleted_at:
      config.deleted_at === null ? null : toISOStringSafe(config.deleted_at),
  };
}
