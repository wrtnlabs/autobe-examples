import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoUserUsersUserId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<ITodoUser> {
  // Step 1: AuthN+AuthZ: only self-deletion allowed
  if (props.user.id !== props.userId) {
    throw new HttpException("You can only delete your own account.", 403);
  }

  // Step 2: Locate user to return deleted info
  const found = await MyGlobal.prisma.todo_users.findUnique({
    where: { id: props.userId },
  });
  if (!found) {
    throw new HttpException("User not found.", 404);
  }

  // Step 3: Perform the actual hard deletion (cascade
  await MyGlobal.prisma.todo_users.delete({
    where: { id: props.userId },
  });

  // Step 4: Return ITodoUser format, converting datetimes safely (no Date usage)
  return {
    id: found.id,
    email: found.email,
    created_at: toISOStringSafe(found.created_at),
    updated_at: toISOStringSafe(found.updated_at),
  };
}
