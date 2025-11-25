import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoAppUserUsersUserIdTasksTaskId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify user authorization
  if (props.user.id !== props.userId) {
    throw new HttpException(
      "Forbidden: You can only delete your own tasks",
      403,
    );
  }

  // Perform hard delete with ownership check in single operation
  try {
    await MyGlobal.prisma.todo_app_tasks.delete({
      where: {
        id: props.taskId,
        todo_app_user_id: props.userId,
      },
    });
  } catch (error) {
    // If delete failed, it means either task doesn't exist or doesn't belong to user
    throw new HttpException("Task not found", 404);
  }
}
