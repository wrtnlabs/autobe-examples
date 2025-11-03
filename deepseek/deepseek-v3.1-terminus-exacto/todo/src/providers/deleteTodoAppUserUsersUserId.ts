import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoAppUserUsersUserId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<ITodoAppUser> {
  const { user, userId } = props;

  // Authorization check: user can only delete their own account
  if (user.id !== userId) {
    throw new HttpException(
      "Unauthorized: You can only delete your own account",
      403,
    );
  }

  // First verify the user exists and get the record for return
  const existingUser = await MyGlobal.prisma.todo_app_users.findUniqueOrThrow({
    where: { id: userId },
  });

  // Perform hard delete as specified in operation description
  await MyGlobal.prisma.todo_app_users.delete({
    where: { id: userId },
  });

  // Return the deleted user information
  return {
    id: existingUser.id as string & tags.Format<"uuid">,
    email: existingUser.email as string & tags.Format<"email">,
    password_hash: existingUser.password_hash,
    status: existingUser.status,
    created_at: toISOStringSafe(existingUser.created_at),
    updated_at: toISOStringSafe(existingUser.updated_at),
    deleted_at: undefined, // Hard delete, so no deleted_at
  } satisfies ITodoAppUser;
}
