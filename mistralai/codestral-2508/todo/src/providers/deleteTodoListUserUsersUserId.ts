import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoListUserUsersUserId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Ensure the requester is the owner (userId matches user.id)
  if (props.user.id !== props.userId) {
    throw new HttpException(
      "You are not authorized to delete this account.",
      403,
    );
  }

  // 2. Look up the user to ensure existence
  const existing = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { id: props.userId },
  });
  if (!existing) {
    throw new HttpException("User not found.", 404);
  }

  // 3. Perform the hard delete
  await MyGlobal.prisma.todo_list_users.delete({
    where: { id: props.userId },
  });
  // There is no return value for void success
}
