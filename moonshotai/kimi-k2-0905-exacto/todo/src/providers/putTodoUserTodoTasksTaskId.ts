import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTask";
import { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putTodoUserTodoTasksTaskId(props: {
  user: UserPayload;
  taskId: string & tags.Format<"uuid">;
  body: ITodoTask.IUpdate;
}): Promise<ITodoTask> {
  // Verify authorization - user must own this task and not be deleted
  const user = await MyGlobal.prisma.todo_users.findFirst({
    where: { id: props.user.id, deleted_at: null },
  });

  if (!user) {
    throw new HttpException("User not found or deleted", 404);
  }

  const task = await MyGlobal.prisma.todo_tasks.findUniqueOrThrow({
    where: { id: props.taskId },
  });

  if (task.todo_user_id !== props.user.id) {
    throw new HttpException(
      "Unauthorized: You can only update your own tasks",
      403,
    );
  }

  // Build update data - convert null API values to undefined for Prisma required fields
  const updateData = {
    ...(props.body.description !== undefined &&
      props.body.description !== null && {
        description: props.body.description,
      }),
    ...(props.body.completed !== undefined &&
      props.body.completed !== null && {
        completed: props.body.completed,
        completed_at: props.body.completed ? toISOStringSafe(new Date()) : null,
      }),
    ...(props.body.business_status !== undefined &&
      props.body.business_status !== null && {
        business_status: props.body.business_status,
      }),
    updated_at: toISOStringSafe(new Date()),
  } satisfies Prisma.todo_tasksUpdateInput;

  // Create task update with manual joins
  const updated = await MyGlobal.prisma.todo_tasks.update({
    where: { id: props.taskId },
    data: updateData,
  });

  const updatedUser = await MyGlobal.prisma.todo_users.findFirstOrThrow({
    where: { id: props.user.id },
    select: {
      id: true,
      email: true,
      mfa_enabled: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  return {
    id: updated.id satisfies string as string,
    description: updated.description,
    completed: updated.completed,
    business_status: updated.business_status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    completed_at: updated.completed_at
      ? toISOStringSafe(updated.completed_at)
      : null,
    user: {
      id: updatedUser.id satisfies string as string,
      email: updatedUser.email,
      mfa_enabled: updatedUser.mfa_enabled,
      tasks_count: 0, // Default value since field doesn't exist in schema
      created_at: toISOStringSafe(updatedUser.created_at),
      updated_at: toISOStringSafe(updatedUser.updated_at),
      deleted_at: updatedUser.deleted_at
        ? toISOStringSafe(updatedUser.deleted_at)
        : null,
    },
  } satisfies ITodoTask as ITodoTask;
}
