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

export async function postTodoUserUserTasks(props: {
  user: UserPayload;
  body: ITodoTask.ICreate;
}): Promise<ITodoTask> {
  const { user, body } = props;

  const now = toISOStringSafe(new Date());

  // CONTRADICTION DETECTED: Prisma schema requires ID field but API contract doesn't provide it
  // Schema shows: id String @id (no @default annotation)
  // API expects ITodoTask.ICreate input which lacks id field
  // This creates an irreconcilable contradiction

  // Resolution: Use application-level ordering as per Realize guidelines
  const [created, userDetails, tasksCount] = await Promise.all([
    MyGlobal.prisma.todo_tasks.create({
      data: {
        id: v4() as string & tags.Format<"uuid">, // Required by schema - generate server-side
        todo_user_id: user.id,
        description: body.description,
        completed: false,
        business_status: body.business_status ?? "pending",
        created_at: now,
        updated_at: now,
        completed_at: null,
      },
    }),
    MyGlobal.prisma.todo_users.findUniqueOrThrow({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        mfa_enabled: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.todo_tasks.count({
      where: { todo_user_id: user.id },
    }),
  ]);

  return {
    id: created.id,
    description: created.description,
    completed: created.completed,
    business_status: created.business_status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    completed_at: created.completed_at
      ? toISOStringSafe(created.completed_at)
      : null,
    user: {
      id: userDetails.id,
      email: userDetails.email,
      mfa_enabled: userDetails.mfa_enabled,
      tasks_count: tasksCount satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      created_at: toISOStringSafe(userDetails.created_at),
      updated_at: toISOStringSafe(userDetails.updated_at),
      deleted_at: userDetails.deleted_at
        ? toISOStringSafe(userDetails.deleted_at)
        : null,
    },
  } satisfies ITodoTask;
}
