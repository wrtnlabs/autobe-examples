import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTaskArray } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTaskArray";
import { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";

export async function getTodoListTasks(): Promise<ITodoListTaskArray> {
  // Fetch all tasks from the todo_list_task table
  // Sort by created_at descending (newest first) as specified
  // No pagination needed for this single-user system
  const tasks = await MyGlobal.prisma.todo_list_task.findMany({
    orderBy: {
      created_at: "desc",
    },
  });

  // Convert all Date objects to ISO strings using toISOStringSafe
  // Ensure all date fields are properly formatted as string & tags.Format<'date-time'>
  return tasks.map((task) => ({
    id: task.id,
    todo_list_user_id: task.todo_list_user_id,
    title: task.title,
    completed: task.completed,
    created_at: toISOStringSafe(task.created_at),
    updated_at: toISOStringSafe(task.updated_at),
    // Include x-autobe-prisma-schema if needed (it's optional in the schema)
    "x-autobe-prisma-schema": "todo_list_task",
  }));
}
