import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";

export async function getTodoListTasksTaskId(props: {
  taskId: string & tags.Format<"uuid">;
}): Promise<ITodoListTask> {
  const task = await MyGlobal.prisma.todo_list_tasks.findUnique({
    where: { id: props.taskId },
  });
  if (!task) {
    throw new HttpException("Task not found", 404);
  }
  return task.id;
}
