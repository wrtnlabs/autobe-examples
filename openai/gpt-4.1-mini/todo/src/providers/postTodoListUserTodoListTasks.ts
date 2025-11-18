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

export async function postTodoListUserTodoListTasks(props: {
  user: UserPayload;
  body: ITodoListTask.ICreate;
}): Promise<ITodoListTask> {
  const created = await MyGlobal.prisma.todo_list_tasks.create({
    data: {
      id: v4(),
      todo_list_user_id: props.user.id,
      title: props.body.title,
      description: props.body.description ?? null,
      is_completed: false,
      completed_at: null,
      deleted_at: null,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: created.id,
    title: created.title,
    description: created.description ?? undefined,
    is_completed: created.is_completed,
    completed_at: created.completed_at
      ? toISOStringSafe(created.completed_at)
      : null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
