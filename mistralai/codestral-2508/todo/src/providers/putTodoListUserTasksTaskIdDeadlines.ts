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

export async function putTodoListUserTasksTaskIdDeadlines(props: {
  user: UserPayload;
  taskId: string & tags.Format<"uuid">;
  body: ITodoListTask.IDeadline;
}): Promise<ITodoListTask> {
  // Check if the task exists and belongs to the user
  const task = await MyGlobal.prisma.todo_list_tasks.findUniqueOrThrow({
    where: {
      id: props.taskId,
    },
  });

  if (task.todo_list_user_id !== props.user.id) {
    throw new HttpException(
      "Unauthorized: You can only update your own tasks",
      403,
    );
  }

  // Update the task deadline
  const updatedTask = await MyGlobal.prisma.todo_list_tasks.update({
    where: {
      id: props.taskId,
    },
    data: {
      deadline: toISOStringSafe(props.body.deadline),
      updated_at: toISOStringSafe(new Date()),
    },
    select: {
      id: true,
      todo_list_user_id: true,
      title: true,
      description: true,
      deadline: true,
      created_at: true,
      updated_at: true,
    },
  });

  // Return the updated task
  return {
    id: updatedTask.id,
    todo_list_user_id: updatedTask.todo_list_user_id,
    title: updatedTask.title,
    description: updatedTask.description,
    deadline: updatedTask.deadline
      ? toISOStringSafe(updatedTask.deadline)
      : undefined,
    created_at: toISOStringSafe(updatedTask.created_at),
    updated_at: toISOStringSafe(updatedTask.updated_at),
  } satisfies ITodoListTask;
}
