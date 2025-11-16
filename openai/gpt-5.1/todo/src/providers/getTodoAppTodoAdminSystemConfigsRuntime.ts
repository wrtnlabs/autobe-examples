import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppSystemConfigRuntime } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemConfigRuntime";
import { TodoadminPayload } from "../decorators/payload/TodoadminPayload";

export async function getTodoAppTodoAdminSystemConfigsRuntime(props: {
  todoAdmin: TodoadminPayload;
}): Promise<ITodoAppSystemConfigRuntime> {
  const rows = await MyGlobal.prisma.todo_app_system_configs.findMany({
    where: {
      is_active: true,
      deleted_at: null,
    },
    orderBy: {
      created_at: "asc",
    },
  });

  const todoConfigs: Record<string, string> = {};
  const authConfigs: Record<string, string> = {};
  const systemConfigs: Record<string, string> = {};

  for (const row of rows) {
    if (row.scope === "todo") {
      todoConfigs[row.key] = row.value;
    } else if (row.scope === "auth") {
      authConfigs[row.key] = row.value;
    } else if (row.scope === "system") {
      systemConfigs[row.key] = row.value;
    }
  }

  const runtimeConfig: ITodoAppSystemConfigRuntime = {
    todo: todoConfigs,
    auth: authConfigs,
    system: systemConfigs,
  };

  return runtimeConfig;
}
