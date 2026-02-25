import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { TodoAppUserTransformer } from "../transformers/TodoAppUserTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putTodoAppUsersUserId(props: {
  userId: string & tags.Format<"uuid">;
  body: ITodoAppUser.IUpdate;
}): Promise<ITodoAppUser> {
  // Authentication context validated at middleware level
  const existingUser = await MyGlobal.prisma.todo_app_users.findUniqueOrThrow({
    where: {
      id: props.userId,
      deleted_at: null,
    },
  });
  const { display_name: displayName } = props.body;
  // Return current data if no update requested
  if (displayName === undefined) {
    return TodoAppUserTransformer.transform(existingUser);
  }
  // Validate display_name constraints when provided
  if (displayName !== null && displayName !== undefined) {
    if (displayName.length < 1 || displayName.length > 50) {
      throw new HttpException(
        "Display name must be between 1 and 50 characters",
        400,
      );
    }
  }
  // Check if actual change is needed
  if (displayName === existingUser.display_name) {
    throw new HttpException(
      "Display name must be different from current value to update",
      400,
    );
  }
  // Prepare update data with ISO string timestamp
  const updateData: Prisma.todo_app_usersUpdateInput = {
    updated_at: toISOStringSafe(new Date()),
  };
  if (displayName !== null && displayName !== undefined) {
    updateData.display_name = displayName;
  }
  // Update user profile
  const updatedUser = await MyGlobal.prisma.todo_app_users.update({
    where: { id: props.userId },
    data: updateData,
    ...TodoAppUserTransformer.select(),
  });
  return TodoAppUserTransformer.transform(updatedUser);
}
