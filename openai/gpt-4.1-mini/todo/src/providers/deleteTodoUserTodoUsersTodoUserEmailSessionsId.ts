import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoUserTodoUsersTodoUserEmailSessionsId(props: {
  user: UserPayload;
  todoUserEmail: string;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { user, todoUserEmail, id } = props;

  const todoUser = await MyGlobal.prisma.todo_users.findFirst({
    where: { email: todoUserEmail, deleted_at: null },
    select: { id: true },
  });

  if (!todoUser) {
    throw new HttpException("Todo user not found", 404);
  }

  const session = await MyGlobal.prisma.todo_user_sessions.findFirst({
    where: { id: id, todo_user_id: todoUser.id },
  });

  if (!session) {
    throw new HttpException("Session not found", 404);
  }

  if (user.id !== todoUser.id) {
    throw new HttpException(
      "Unauthorized: Cannot delete other users' sessions",
      403,
    );
  }

  await MyGlobal.prisma.todo_user_sessions.delete({
    where: { id },
  });
}
