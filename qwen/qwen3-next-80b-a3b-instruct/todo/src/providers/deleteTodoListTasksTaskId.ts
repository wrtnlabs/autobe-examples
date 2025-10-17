import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteTodoListTasksTaskId(props: {
  taskId: string & tags.Format<"uuid">;
}): Promise<void> {
  const task = await MyGlobal.prisma.todo_list_task.findUniqueOrThrow({
    where: { id: props.taskId },
  });

  await MyGlobal.prisma.todo_list_task.delete({
    where: { id: props.taskId },
  });
}
