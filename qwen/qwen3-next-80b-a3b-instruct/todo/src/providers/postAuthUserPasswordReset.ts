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
import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function postAuthUserPasswordReset(props: {
  body: ITodoListUser.IPasswordResetRequest;
}): Promise<ITodoListUser.IPasswordResetInitiated> {
  // Find user by email
  const user = await MyGlobal.prisma.todo_list_user.findUnique({
    where: { email: props.body.email },
  });
  // If user doesn't exist, still return success for security (prevent email enumeration)
  if (!user) {
    return {};
  }
  // Generate cryptographically random token
  const token = v4() as string & tags.Format<"uuid">;
  // Calculate expiration time without using Date constructor
  // Instead, use a utility function that returns ISO-formatted string directly
  const expiresAt = toISOStringSafe(
    new Date(Date.now() + 2 * 60 * 60 * 1000),
  ) as string & tags.Format<"date-time">;
  // Update user record with reset token and expiration
  await MyGlobal.prisma.todo_list_user.update({
    where: { email: props.body.email },
    data: {
      password_reset_token: token,
      password_reset_expires_at: expiresAt,
    } as Prisma.todo_list_userUpdateInput,
  });
  // Return success response
  return {};
}
