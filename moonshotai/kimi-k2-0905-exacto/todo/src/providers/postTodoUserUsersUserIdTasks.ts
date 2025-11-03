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

export async function postTodoUserUsersUserIdTasks(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  body: ITodoTask.ICreate;
}): Promise<ITodoTask> {
  // Authorization: verify the authenticated user matches the target userId
  if (props.user.id !== props.userId) {
    throw new HttpException(
      "Unauthorized: You can only create tasks for your own account",
      403,
    );
  }

  // Prepare business status with default
  const businessStatus = props.body.business_status ?? "pending";

  // Create task with all required fields verified from schema
  const created = await MyGlobal.prisma.todo_tasks.create({
    data: {
      id: v4() as string & tags.Format<"uuid">, // Manual ID required (schema has no @default)
      todo_user_id: props.userId,
      description: props.body.description,
      completed: false, // Default incomplete
      business_status: businessStatus,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      // completed_at remains null for new tasks (field is optional)
    },
    include: {
      user: true,
    },
  });

  // Count total tasks for this user
  const tasksCount = await MyGlobal.prisma.todo_tasks.count({
    where: {
      todo_user_id: props.userId,
      // Apply soft delete filter based on existing pattern in schema
      user: {
        deleted_at: null,
      },
    },
  });

  return {
    id: created.id as string & tags.Format<"uuid">,
    description: created.description,
    completed: created.completed,
    business_status: created.business_status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    completed_at: created.completed_at
      ? toISOStringSafe(created.completed_at)
      : null,
    user: {
      id: created.user.id as string & tags.Format<"uuid">,
      email: created.user.email as string & tags.Format<"email">,
      mfa_enabled: created.user.mfa_enabled,
      tasks_count: tasksCount,
      created_at: toISOStringSafe(created.user.created_at),
      updated_at: toISOStringSafe(created.user.updated_at),
      deleted_at: created.user.deleted_at
        ? toISOStringSafe(created.user.deleted_at)
        : null,
    },
  };
}
