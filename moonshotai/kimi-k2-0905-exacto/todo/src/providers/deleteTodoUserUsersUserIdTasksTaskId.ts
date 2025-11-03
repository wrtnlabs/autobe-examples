import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoUserUsersUserIdTasksTaskId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify user is deleting their own tasks
  if (props.user.id !== props.userId) {
    throw new HttpException(
      "Unauthorized: You can only delete your own tasks",
      403,
    );
  }

  // Find and verify task ownership in single query
  const task = await MyGlobal.prisma.todo_tasks.findUniqueOrThrow({
    where: {
      id: props.taskId,
      todo_user_id: props.user.id, // Ensure task belongs to user
    },
  });

  // Hard delete the task - no soft delete since no deleted_at field
  await MyGlobal.prisma.todo_tasks.delete({
    where: { id: props.taskId },
  });
}
