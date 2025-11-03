import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoUserTodoTasksTaskId(props: {
  user: UserPayload;
  taskId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Fetch existing task to verify ownership
  const existingTask = await MyGlobal.prisma.todo_tasks
    .findUniqueOrThrow({
      where: { id: props.taskId },
    })
    .catch(() => {
      throw new HttpException("Task not found", 404);
    });

  // Validate ownership - user can only delete their own tasks
  if (existingTask.todo_user_id !== props.user.id) {
    throw new HttpException(
      "Unauthorized: You can only delete your own tasks",
      403,
    );
  }

  // Perform hard delete - no soft delete fields exist in schema
  await MyGlobal.prisma.todo_tasks.delete({
    where: { id: props.taskId },
  });
}
