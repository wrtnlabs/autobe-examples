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
import { TodoTaskCollector } from "../collectors/TodoTaskCollector";
import { TodoTaskTransformer } from "../transformers/TodoTaskTransformer";

export async function postTodoUserTasks(props: {
  user: UserPayload;
  body: ITodoTask.ICreate;
}): Promise<ITodoTask> {
  const created = await MyGlobal.prisma.todo_tasks.create({
    data: await TodoTaskCollector.collect({
      body: props.body,
    }),
    ...TodoTaskTransformer.select(),
  });
  return await TodoTaskTransformer.transform(created);
}
