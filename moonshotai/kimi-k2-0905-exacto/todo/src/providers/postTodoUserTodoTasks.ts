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

export async function postTodoUserTodoTasks(props: {
  user: UserPayload;
  body: ITodoTask.ICreate;
}): Promise<ITodoTask> {
  const { user, body } = props;

  // Create new todo task
  const created = await MyGlobal.prisma.todo_tasks.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      todo_user_id: user.id,
      description: body.description,
      completed: false,
      business_status: body.business_status ?? "pending",
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      completed_at: null,
    },
  });

  // Get user summary for response
  const userData = await MyGlobal.prisma.todo_users.findUniqueOrThrow({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      mfa_enabled: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      _count: {
        select: {
          todo_tasks: true,
        },
      },
    },
  });

  // Build response - Prisma returns Date objects, convert to ISO strings
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
      id: userData.id as string & tags.Format<"uuid">,
      email: userData.email,
      mfa_enabled: userData.mfa_enabled,
      tasks_count: userData._count.todo_tasks,
      created_at: toISOStringSafe(userData.created_at),
      updated_at: toISOStringSafe(userData.updated_at),
      deleted_at: userData.deleted_at
        ? toISOStringSafe(userData.deleted_at)
        : null,
    },
  } satisfies ITodoTask;
}
