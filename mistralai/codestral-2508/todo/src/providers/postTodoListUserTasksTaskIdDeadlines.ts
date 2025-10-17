import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postTodoListUserTasksTaskIdDeadlines(props: {
  user: UserPayload;
  taskId: string & tags.Format<"uuid">;
  body: ITodoListTask.IDeadline;
}): Promise<ITodoListTask> {
  // Verify the task exists and belongs to the authenticated user
  const task = await MyGlobal.prisma.todo_list_tasks.findUnique({
    where: {
      id: props.taskId,
    },
  });

  if (!task) {
    throw new HttpException("Task not found", 404);
  }

  if (task.todo_list_user_id !== props.user.id) {
    throw new HttpException(
      "Unauthorized: You can only update your own tasks",
      403,
    );
  }

  // Update the deadline for the task
  const updatedTask = await MyGlobal.prisma.todo_list_tasks.update({
    where: {
      id: props.taskId,
    },
    data: {
      deadline: toISOStringSafe(props.body.deadline),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Return the updated task with proper type conversion
  return {
    id: updatedTask.id as string & tags.Format<"uuid">,
    todo_list_user_id: updatedTask.todo_list_user_id as string &
      tags.Format<"uuid">,
    title: updatedTask.title,
    description: updatedTask.description,
    deadline: updatedTask.deadline
      ? toISOStringSafe(updatedTask.deadline)
      : undefined,
    created_at: toISOStringSafe(updatedTask.created_at),
    updated_at: toISOStringSafe(updatedTask.updated_at),
  } satisfies ITodoListTask;
}
