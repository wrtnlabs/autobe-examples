import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoAppUserTransformer } from "../transformers/TodoAppUserTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

/**
 * Update the authenticated user's profile information.
 * Only updates display_name field as email is immutable.
 */
export async function patchTodoAppUserUsersProfile(props: {
  user: UserPayload;
  body: ITodoAppUser.IUpdate;
}): Promise<ITodoAppUser> {
  // Extract display_name from request body
  const { display_name } = props.body;
  // Validate display_name meets specification requirements (1-50 characters)
  if (display_name !== undefined && display_name !== null) {
    if (display_name.trim().length < 1 || display_name.length > 50) {
      throw new HttpException(
        "Display name must be between 1 and 50 characters",
        400,
      );
    }
  }
  // If display_name is null or undefined, no update needed
  if (display_name === undefined || display_name === null) {
    const currentUser = await MyGlobal.prisma.todo_app_users.findUniqueOrThrow({
      where: {
        id: props.user.id,
        deleted_at: null,
      },
      ...TodoAppUserTransformer.select(),
    });
    return await TodoAppUserTransformer.transform(currentUser);
  }
  // Update user profile with validated display_name
  const updatedUser = await MyGlobal.prisma.todo_app_users.update({
    where: {
      id: props.user.id,
      deleted_at: null,
    },
    data: {
      display_name: display_name.trim(),
      updated_at: new Date(),
    },
    ...TodoAppUserTransformer.select(),
  });
  return await TodoAppUserTransformer.transform(updatedUser);
}
