import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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
  // Verify authenticated user matches the target user ID
  if (props.user.id !== props.userId) {
    throw new HttpException(
      "Unauthorized: You can only delete your own account",
      403,
    );
  }
  // Delete the user record directly (cascade deletion will handle related records)
  await MyGlobal.prisma.todo_list_user.delete({
    where: {
      id: props.userId,
    },
  });
}
