import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodoPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoPriority";

export async function getTodoAppTodosPrioritiesPriorityCode(props: {
  priorityCode: string;
}): Promise<ITodoAppTodoPriority> {
  const priority = await MyGlobal.prisma.todo_app_todo_priorities.findUnique({
    where: { code: props.priorityCode },
  });

  if (!priority) {
    throw new HttpException("Priority not found", 404);
  }

  return {
    id: priority.id,
    code: priority.code,
    name: priority.name,
    description: priority.description ?? undefined,
    weight: priority.weight,
    is_active: priority.is_active,
    created_at: toISOStringSafe(priority.created_at),
  };
}
