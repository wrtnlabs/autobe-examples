import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoListUserTasksTaskId(props: {
  user: UserPayload;
  taskId: string;
}): Promise<void> {
  const task = await MyGlobal.prisma.todo_list_task.findUnique({
    where: {
      id: props.taskId,
      user_id: props.user.id,
      deleted_at: null,
    },
  });

  if (!task) {
    throw new HttpException("Task not found or already deleted", 404);
  }

  await MyGlobal.prisma.todo_list_task.delete({
    where: {
      id: props.taskId,
    },
  });
}
