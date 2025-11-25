import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodoListSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoListSystemConfiguration";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getTodoListAdminTodoListSystemConfigurationsKey(props: {
  admin: AdminPayload;
  key: string;
}): Promise<ITodoListTodoListSystemConfiguration> {
  const config =
    await MyGlobal.prisma.todo_list_system_configurations.findUnique({
      where: { key: props.key },
    });

  if (config === null) {
    throw new HttpException("Configuration not found", 404);
  }

  return {
    key: config.key,
    value: config.value,
    description: config.description === null ? undefined : config.description,
    created_at: config.created_at ? toISOStringSafe(config.created_at) : null,
    updated_at: config.updated_at ? toISOStringSafe(config.updated_at) : null,
    deleted_at: config.deleted_at ? toISOStringSafe(config.deleted_at) : null,
  };
}
