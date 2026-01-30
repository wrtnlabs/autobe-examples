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

export async function putTodoAppUserUsersUserId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  body: ITodoAppUser.IUpdate;
}): Promise<ITodoAppUser> {
  // Validate that authenticated user matches path parameter
  if (props.user.id !== props.userId) {
    throw new HttpException("Unauthorized: User ID mismatch", 403);
  }
  // Find the user by ID
  const existingUser = await MyGlobal.prisma.todo_app_users.findUnique({
    where: { id: props.userId },
  });
  if (!existingUser) {
    throw new HttpException("User not found", 404);
  }
  // Since ITodoAppUser.IUpdate is an empty object ({}), no fields can be updated
  // This is a system-level inconsistency between the operation spec and DTO definition
  // Per spec, we should allow email and username updates, but IUpdate is defined as {}
  // We cannot perform any updates with the given DTO structure
  // Return the existing user as-is (unchanged)
  return TodoAppUserTransformer.transform(existingUser);
}
