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
  const taskId = v4() as string & tags.Format<"uuid">;
  const createdTask = await MyGlobal.prisma.todo_list_tasks.create({
    data: {
      id: taskId,
      user_id: props.user.id,
      title: props.body.title,
      description: props.body.description,
      completed: false,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
  return createdTask.id as ITodoListTask;
}
