import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTask";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoTaskTransformer } from "../transformers/TodoTaskTransformer";

export async function putTodoUserTasksTaskCode(props: {
  user: UserPayload;
  taskCode: string;
  body: ITodoTask.IUpdate;
}): Promise<ITodoTask> {
  const task = await MyGlobal.prisma.todo_tasks.findUnique({
    where: { id: props.taskCode },
  });
  if (!task) {
    throw new HttpException("Task not found", 404);
  }
  const updated = await MyGlobal.prisma.todo_tasks.update({
    where: { id: props.taskCode },
    data: {
      ...props.body,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  return await TodoTaskTransformer.transform(updated);
}
