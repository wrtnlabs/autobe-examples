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
  taskId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the task to ensure it exists and belongs to the user
  const task = await MyGlobal.prisma.todo_list_tasks.findUniqueOrThrow({
    where: {
      id: props.taskId,
    },
  });

  // Verify the task belongs to the authenticated user
  if (task.todo_list_user_id !== props.user.id) {
    throw new HttpException(
      "Unauthorized: You can only delete your own tasks",
      403,
    );
  }

  // Delete the task
  await MyGlobal.prisma.todo_list_tasks.delete({
    where: {
      id: props.taskId,
    },
  });
}
