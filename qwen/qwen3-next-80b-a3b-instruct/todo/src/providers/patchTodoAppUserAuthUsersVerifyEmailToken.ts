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

export async function patchTodoAppUserAuthUsersVerifyEmailToken(props: {
  user: UserPayload;
  token: string;
}): Promise<ITodoAppUser> {
  // Validate token exists and is not expired or already used
  const now = toISOStringSafe(new Date());
  const verification =
    await MyGlobal.prisma.todo_app_user_email_verifications.findFirst({
      where: {
        token: props.token,
        expired_at: {
          gte: now,
        },
      },
    });
  if (!verification) {
    throw new HttpException("Invalid or expired verification token", 400);
  }
  // Update user email verification status
  const updatedUser = await MyGlobal.prisma.todo_app_users.update({
    where: { id: verification.user_id },
    data: {
      email_verified: true,
      updated_at: now,
    },
  });
  // Invalidate the verification token
  await MyGlobal.prisma.todo_app_user_email_verifications.update({
    where: { id: verification.id },
    data: {},
  });
  // Return updated user via transformer
  return TodoAppUserTransformer.transform(updatedUser);
}
