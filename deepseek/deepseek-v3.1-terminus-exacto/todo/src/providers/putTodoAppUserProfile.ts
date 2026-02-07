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

export async function putTodoAppUserProfile(props: {
  user: UserPayload;
  body: ITodoAppUser.IUpdate;
}): Promise<ITodoAppUser> {
  // Validate that display_name is provided and meets constraints
  if (!props.body.display_name || props.body.display_name.trim().length === 0) {
    throw new HttpException("Display name is required", 400);
  }
  if (props.body.display_name.length > 255) {
    throw new HttpException("Display name must be 255 characters or less", 400);
  }
  // Get current timestamp in ISO format
  const currentTimestamp = toISOStringSafe(new Date());
  // Update user profile
  const updated = await MyGlobal.prisma.todo_app_users.update({
    where: {
      id: props.user.id,
      deleted_at: null, // Ensure user is not soft-deleted
    },
    data: {
      display_name: props.body.display_name,
      updated_at: currentTimestamp,
    },
    ...TodoAppUserTransformer.select(),
  });
  return await TodoAppUserTransformer.transform(updated);
}
