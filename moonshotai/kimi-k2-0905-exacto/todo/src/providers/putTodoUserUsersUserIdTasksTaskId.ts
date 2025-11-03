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

export async function putTodoUserUsersUserIdTasksTaskId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
  body: ITodoTask.IUpdate;
}): Promise<ITodoTask> {
  // Verify task ownership - users can only update their own tasks
  const task = await MyGlobal.prisma.todo_tasks.findUniqueOrThrow({
    where: { id: props.taskId },
  });

  if (task.todo_user_id !== props.user.id) {
    throw new HttpException(
      "Unauthorized: You can only update your own tasks",
      403,
    );
  }

  // Build update data with proper null/undefined handling
  const now = toISOStringSafe(new Date());
  const completedAt =
    props.body.completed === true
      ? now
      : props.body.completed === false
        ? null
        : undefined;

  // Update the task
  const updated = await MyGlobal.prisma.todo_tasks.update({
    where: { id: props.taskId },
    data: {
      description: props.body.description ?? undefined,
      completed: props.body.completed ?? undefined,
      business_status: props.body.business_status ?? undefined,
      updated_at: now,
      completed_at: completedAt,
    },
  });

  // Fetch user data in separate query for proper typing
  const userData = await MyGlobal.prisma.todo_users.findUniqueOrThrow({
    where: { id: updated.todo_user_id },
    select: {
      id: true,
      email: true,
      mfa_enabled: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      _count: {
        select: { todo_tasks: true },
      },
    },
  });

  // Return properly typed task with user summary
  return {
    id: updated.id,
    description: updated.description,
    completed: updated.completed,
    business_status: updated.business_status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    completed_at: updated.completed_at
      ? toISOStringSafe(updated.completed_at)
      : undefined,
    user: {
      id: userData.id as string & tags.Format<"uuid">,
      email: userData.email,
      mfa_enabled: userData.mfa_enabled,
      tasks_count: userData._count.todo_tasks,
      created_at: toISOStringSafe(userData.created_at),
      updated_at: toISOStringSafe(userData.updated_at),
      deleted_at: userData.deleted_at
        ? toISOStringSafe(userData.deleted_at)
        : undefined,
    },
  };
}
