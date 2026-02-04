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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putTodoAppUserProfile(props: {
  user: UserPayload;
  body: ITodoAppUser.IUpdate;
}): Promise<ITodoAppUser> {
  // Validate display_name length constraints (already typed but verify business logic)
  if (
    props.body.display_name.length === 0 ||
    props.body.display_name.trim().length === 0
  ) {
    throw new HttpException(
      "display_name cannot be empty or whitespace-only",
      400,
    );
  }
  if (props.body.display_name.length > 50) {
    throw new HttpException("display_name cannot exceed 50 characters", 400);
  }
  // Find user by id from JWT payload
  const user = await MyGlobal.prisma.todo_app_users.findUnique({
    where: {
      id: props.user.id,
      deleted_at: null,
    },
  });
  if (!user) {
    throw new HttpException("User not found", 404);
  }
  // Update only display_name and updated_at
  const updated = await MyGlobal.prisma.todo_app_users.update({
    where: {
      id: props.user.id,
    },
    data: {
      display_name: props.body.display_name,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // Return full user profile as specified in ITodoAppUser
  return {
    display_name: updated.display_name,
    email: updated.email,
    updated_at: updated.updated_at,
  };
}
