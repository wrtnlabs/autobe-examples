import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoUserUsersUserId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Users can only delete their own accounts
  if (props.userId !== props.user.id) {
    throw new HttpException(
      "Forbidden: You can only delete your own account",
      403,
    );
  }

  // Hard delete the user account - cascade deletes all related data
  await MyGlobal.prisma.todo_users.delete({
    where: { id: props.userId },
  });
}
