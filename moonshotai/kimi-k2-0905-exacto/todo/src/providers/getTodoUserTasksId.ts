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

export async function getTodoUserTasksId(props: {
  user: UserPayload;
  id: string & tags.Format<"uuid">;
}): Promise<ITodoTask> {
  const task = await MyGlobal.prisma.todo_tasks.findFirstOrThrow({
    where: {
      id: props.id,
      todo_user_id: props.user.id,
    },
    include: {
      user: true,
    },
  });

  return {
    id: task.id,
    description: task.description,
    completed: task.completed,
    business_status: task.business_status,
    created_at: toISOStringSafe(task.created_at),
    updated_at: toISOStringSafe(task.updated_at),
    completed_at: task.completed_at ? toISOStringSafe(task.completed_at) : null,
    user: {
      id: task.user.id,
      email: task.user.email,
      mfa_enabled: task.user.mfa_enabled,
      tasks_count: 1,
      created_at: toISOStringSafe(task.user.created_at),
      updated_at: toISOStringSafe(task.user.updated_at),
      deleted_at: task.user.deleted_at
        ? toISOStringSafe(task.user.deleted_at)
        : null,
    },
  };
}
