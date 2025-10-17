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

export async function getTodoListUserTasksTaskId(props: {
  user: UserPayload;
  taskId: string;
}): Promise<ITodoListTask> {
  // Validate taskId format
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      props.taskId,
    )
  ) {
    throw new HttpException("Invalid task ID format", 400);
  }

  // Find the task with the given ID and verify ownership in one query
  const task = await MyGlobal.prisma.todo_list_tasks.findUniqueOrThrow({
    where: {
      id: props.taskId,
      todo_list_user_id: props.user.id,
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

  // Return the task details with proper typing
  return {
    id: task.id as string & tags.Format<"uuid">,
    todo_list_user_id: task.todo_list_user_id as string & tags.Format<"uuid">,
    title: task.title,
    description: task.description,
    deadline: task.deadline ? toISOStringSafe(task.deadline) : undefined,
    created_at: toISOStringSafe(task.created_at),
    updated_at: toISOStringSafe(task.updated_at),
  } satisfies ITodoListTask;
}
