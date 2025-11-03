import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoUserUserTasksId(props: {
  user: UserPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  // Fetch the task to verify ownership
  const task = await MyGlobal.prisma.todo_tasks.findUnique({
    where: { id: props.id },
  });

  if (!task) {
    throw new HttpException("Task not found", 404);
  }

  // Check if the task belongs to the authenticated user
  if (task.todo_user_id !== props.user.id) {
    throw new HttpException(
      "Unauthorized: You can only delete your own tasks",
      403,
    );
  }

  // Perform hard delete
  await MyGlobal.prisma.todo_tasks.delete({
    where: { id: props.id },
  });
}
