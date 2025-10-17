import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoListUserTodoListTasksId(props: {
  user: UserPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const task = await MyGlobal.prisma.todo_list_tasks.findUnique({
    where: { id: props.id },
  });

  if (!task) {
    throw new HttpException("Todo task not found", 404);
  }

  if (task.todo_list_user_id !== props.user.id) {
    throw new HttpException(
      "Forbidden: You can only delete your own tasks",
      403,
    );
  }

  await MyGlobal.prisma.todo_list_tasks.delete({
    where: { id: props.id },
  });
}
