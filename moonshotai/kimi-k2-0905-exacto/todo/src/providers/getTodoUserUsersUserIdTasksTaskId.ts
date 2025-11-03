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

export async function getTodoUserUsersUserIdTasksTaskId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
}): Promise<ITodoTask> {
  // Authorization check - ensure user can only access their own tasks
  if (props.user.id !== props.userId) {
    throw new HttpException(
      "Unauthorized: You can only access your own tasks",
      403,
    );
  }

  // Find task that belongs to the authenticated user
  const task = await MyGlobal.prisma.todo_tasks.findUniqueOrThrow({
    where: {
      id: props.taskId,
      todo_user_id: props.userId,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          mfa_enabled: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          // tasks_count: true, // Removed - doesn't exist in database
        },
      },
    },
  });

  return {
    id: task.id as string & tags.Format<"uuid">,
    description: task.description,
    completed: task.completed,
    business_status: task.business_status,
    created_at: toISOStringSafe(task.created_at),
    updated_at: toISOStringSafe(task.updated_at),
    completed_at: task.completed_at ? toISOStringSafe(task.completed_at) : null,
    user: {
      id: task.user.id as string & tags.Format<"uuid">,
      email: task.user.email as string & tags.Format<"email">,
      mfa_enabled: task.user.mfa_enabled,
      created_at: toISOStringSafe(task.user.created_at),
      updated_at: toISOStringSafe(task.user.updated_at),
      deleted_at: task.user.deleted_at
        ? toISOStringSafe(task.user.deleted_at)
        : undefined,
      tasks_count: 0, // Add default value for tasks_count
    },
  };
}
