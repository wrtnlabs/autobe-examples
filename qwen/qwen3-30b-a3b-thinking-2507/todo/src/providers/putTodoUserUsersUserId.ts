import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putTodoUserUsersUserId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  body: ITodoUser.IUpdate;
}): Promise<ITodoUser> {
  // Verify user ownership
  if (props.user.id !== props.userId) {
    throw new HttpException(
      "Forbidden - You can only edit your own profile",
      403,
    );
  }
  // Handle empty displayName - no change (including undefined)
  const displayName = props.body.displayName;
  if (displayName == null || displayName.trim().length === 0) {
    const existingUser = await MyGlobal.prisma.todo_users.findUnique({
      where: { id: props.userId },
      select: { id: true },
    });
    if (!existingUser) {
      throw new HttpException("User not found", 404);
    }
    return { id: existingUser.id };
  }
  // Now we know displayName is defined and non-empty
  if (displayName.length < 1 || displayName.length > 50) {
    throw new HttpException("Display name must be 1-50 characters", 422);
  }
  const pattern = /^[a-zA-Z0-9 .,_:';()/-]+$/;
  if (!pattern.test(displayName)) {
    throw new HttpException("Display name contains invalid characters", 422);
  }
  // Update database only the required field
  const updatedUser = await MyGlobal.prisma.todo_users.update({
    where: { id: props.userId },
    data: {
      display_name: displayName,
    },
    select: { id: true },
  });
  return { id: updatedUser.id };
}
