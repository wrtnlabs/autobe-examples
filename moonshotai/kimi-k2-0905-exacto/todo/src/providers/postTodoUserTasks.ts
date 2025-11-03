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

export async function postTodoUserTasks(props: {
  user: UserPayload;
  body: ITodoTask.ICreate;
}): Promise<ITodoTask> {
  const { user, body } = props;

  // Default business_status to "pending" if not provided
  const businessStatus = body.business_status ?? "pending";

  // Create task with required fields
  const created = await MyGlobal.prisma.todo_tasks.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      todo_user_id: user.id,
      description: body.description,
      completed: false,
      business_status: businessStatus,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
    include: {
      user: true,
    },
  });

  // Create session for connection tracking
  await MyGlobal.prisma.todo_user_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      todo_user_id: user.id,
      ip: body.ip ?? "",
      href: body.href,
      referrer: body.referrer,
      created_at: toISOStringSafe(new Date()),
    },
  });

  // Get current task count for user
  const tasksCount = await MyGlobal.prisma.todo_tasks.count({
    where: { todo_user_id: user.id },
  });

  // Return formatted task object with proper type handling
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
      email: created.user.email,
      mfa_enabled: created.user.mfa_enabled,
      tasks_count: tasksCount,
      created_at: toISOStringSafe(created.user.created_at),
      updated_at: toISOStringSafe(created.user.updated_at),
      deleted_at: created.user.deleted_at
        ? toISOStringSafe(created.user.deleted_at)
        : null,
    },
  } satisfies ITodoTask;
}
