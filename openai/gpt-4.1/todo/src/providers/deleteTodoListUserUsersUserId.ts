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
  // Step 1: Authorization check - only the user can delete themselves
  if (props.user.id !== props.userId) {
    throw new HttpException(
      "Forbidden: You can only delete your own account.",
      403,
    );
  }

  // Step 2: Hard delete of user account
  const deletedUser = await MyGlobal.prisma.todo_list_users.delete({
    where: { id: props.userId },
  });

  // Step 3: Confirm deletion (if user did not exist, Prisma would throw, so no need to check null)
  // Operation complete, return void
}
