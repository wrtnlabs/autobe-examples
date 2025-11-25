import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoListUserUsersEmail(props: {
  user: UserPayload;
  email: string & tags.Format<"email">;
}): Promise<void> {
  // Look up the user account by email
  const userRecord = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { email: props.email },
  });

  if (!userRecord) {
    throw new HttpException(
      "No account found for the given email address.",
      404,
    );
  }

  // Only the authenticated user can delete their own account
  if (userRecord.id !== props.user.id) {
    throw new HttpException(
      "You are not authorized to delete another user's account.",
      403,
    );
  }

  // Cascade: Delete all Todos owned by the user first, then delete the user
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.todo_list_todos.deleteMany({
      where: { user_id: userRecord.id },
    }),
    MyGlobal.prisma.todo_list_users.delete({
      where: { id: userRecord.id },
    }),
  ]);

  // Void return
}
