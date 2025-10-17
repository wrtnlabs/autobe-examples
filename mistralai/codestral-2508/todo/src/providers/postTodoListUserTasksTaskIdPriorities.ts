import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTaskPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTaskPriority";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postTodoListUserTasksTaskIdPriorities(props: {
  user: UserPayload;
  taskId: string & tags.Format<"uuid">;
  body: ITodoListTaskPriority.ICreate;
}): Promise<ITodoListTaskPriority> {
  // Check if the task exists
  const task = await MyGlobal.prisma.todo_list_tasks.findUnique({
    where: { id: props.taskId },
  });

  if (!task) {
    throw new HttpException("Task not found", 404);
  }

  // Check if the user owns the task
  if (task.todo_list_user_id !== props.user.id) {
    throw new HttpException(
      "Unauthorized: You can only create priorities for your own tasks",
      403,
    );
  }

  // Create the task priority
  const created = await MyGlobal.prisma.todo_list_task_priorities.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      todo_list_task_id: props.taskId,
      priority_level: props.body.priority_level,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Return the created task priority
  return {
    id: created.id,
    todo_list_task_id: created.todo_list_task_id,
    priority_level: created.priority_level,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
