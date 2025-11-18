import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoListUserUsersSelf(props: {
  user: UserPayload;
}): Promise<void> {
  const userId = props.user.id;
  const deleted = await MyGlobal.prisma.$transaction(async (tx) => {
    // Delete all todos owned by this user
    await tx.todo_list_todos.deleteMany({
      where: { todo_list_user_id: userId },
    });
    // Delete all sessions owned by this user
    await tx.todo_list_user_sessions.deleteMany({
      where: { todo_list_user_id: userId },
    });
    // Delete the user itself
    return await tx.todo_list_users.delete({ where: { id: userId } });
  });

  if (!deleted) {
    throw new HttpException("User account not found or already deleted", 404);
  }
  // All user-related data is now gone. Token/session invalidation occurs at the middleware layer.
}
