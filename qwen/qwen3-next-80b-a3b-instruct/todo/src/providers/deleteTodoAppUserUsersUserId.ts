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
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoAppUserTransformer } from "../transformers/TodoAppUserTransformer";

export async function deleteTodoAppUserUsersUserId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<ITodoAppUser> {
  // Fetch the user entity before deletion to return it
  const user = await MyGlobal.prisma.todo_app_users.findUnique({
    where: { id: props.userId },
  });
  if (!user) {
    throw new HttpException("User not found", 404);
  }
  // Delete user and cascade delete all related entities
  // The database schema defines cascading delete rules for:
  // - todo_app_user_email_verifications
  // - todo_app_user_password_resets
  // - todo_app_user_sessions
  // - todo_app_todo_items
  await MyGlobal.prisma.todo_app_users.delete({
    where: { id: props.userId },
  });
  // Return the deleted user entity as specified
  // Use the loaded transformer to format the response
  return TodoAppUserTransformer.transform(user);
}
