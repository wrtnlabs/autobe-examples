import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postTodoListUserTasks(props: {
  user: UserPayload;
  body: ITodoListTask.ICreate;
}): Promise<ITodoListTask> {
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.todo_list_task.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      description: props.body.description,
      user_id: props.user.id,
      session_id: props.user.session_id,
      created_at: now as string & tags.Format<"date-time">,
      updated_at: now as string & tags.Format<"date-time">,
      completed: false,
      completed_at: undefined,
    },
  });

  return {
    id: created.id,
    description: created.description,
    completed: created.completed,
    created_at: toISOStringSafe(created.created_at) as string &
      tags.Format<"date-time">,
    completed_at: created.completed_at
      ? (toISOStringSafe(created.completed_at) as string &
          tags.Format<"date-time">)
      : undefined,
  };
}
