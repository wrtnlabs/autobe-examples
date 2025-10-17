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
  const { user, body } = props;

  // Helper function to brand UUID string without 'as'
  function brandUuid(uuid: string): string & tags.Format<"uuid"> {
    return uuid;
  }

  const id = brandUuid(v4());
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.todo_list_tasks.create({
    data: {
      id,
      todo_list_user_id: user.id,
      description: body.description,
      is_completed: false,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    todo_list_user_id: created.todo_list_user_id,
    description: created.description,
    is_completed: created.is_completed,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null && created.deleted_at !== undefined
        ? toISOStringSafe(created.deleted_at)
        : null,
  };
}
