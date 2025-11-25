import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoListUserUsersMe(props: {
  user: UserPayload;
}): Promise<void> {
  // Confirm user payload is present and valid
  if (!props.user || props.user.type !== "user") {
    throw new HttpException(
      "Authentication required to delete this account.",
      403,
    );
  }

  // Atomic hard deletion of user and all associated data
  await MyGlobal.prisma.$transaction([
    // Delete all todos for this user
    MyGlobal.prisma.todo_list_todos.deleteMany({
      where: { todo_list_user_id: props.user.id },
    }),
    // Delete all active/past sessions for this user
    MyGlobal.prisma.todo_list_user_sessions.deleteMany({
      where: { todo_list_user_id: props.user.id },
    }),
    // Delete all email verifications for this user
    MyGlobal.prisma.todo_list_user_email_verifications.deleteMany({
      where: { todo_list_user_id: props.user.id },
    }),
    // Delete all password reset requests for this user
    MyGlobal.prisma.todo_list_user_password_resets.deleteMany({
      where: { todo_list_user_id: props.user.id },
    }),
    // Finally, delete the user record itself
    MyGlobal.prisma.todo_list_users.delete({
      where: { id: props.user.id },
    }),
  ]);
}
