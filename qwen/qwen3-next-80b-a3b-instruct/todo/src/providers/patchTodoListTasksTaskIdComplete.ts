import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";

export async function patchTodoListTasksTaskIdComplete(props: {
  taskId: string & tags.Format<"uuid">;
}): Promise<ITodoListTask> {
  // Fetch the task to confirm existence
  const task = await MyGlobal.prisma.todo_list_task.findUniqueOrThrow({
    where: { id: props.taskId },
  });

  // Toggle the completed status and update timestamp
  const updatedTask = await MyGlobal.prisma.todo_list_task.update({
    where: { id: props.taskId },
    data: {
      completed: !task.completed,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Return as ITodoListTask type (satisfies ensures correct structure)
  return {
    id: updatedTask.id,
    todo_list_user_id: updatedTask.todo_list_user_id,
    title: updatedTask.title,
    completed: updatedTask.completed,
    created_at: toISOStringSafe(updatedTask.created_at),
    updated_at: toISOStringSafe(updatedTask.updated_at),
  } satisfies ITodoListTask;
}
