import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";

export async function postAuthTodoUserPasswordReset(props: {
  body: ITodoAppTodoUser.IResetPassword;
}): Promise<ITodoAppTodoUser.ISummary> {
  const { body } = props;

  // Locate user by one-time token
  const user = await MyGlobal.prisma.todo_app_todouser.findFirst({
    where: { password_reset_token: body.token },
  });

  if (!user)
    throw new HttpException("Invalid or expired password reset token", 400);

  // Validate expiry (business logic)
  if (
    !user.password_reset_expires_at ||
    user.password_reset_expires_at.getTime() < Date.now()
  ) {
    throw new HttpException("Invalid or expired password reset token", 400);
  }

  // Hash new password
  const newHashed = await PasswordUtil.hash(body.password);

  // Prepare ISO timestamps
  const revokedAt = toISOStringSafe(new Date());
  const updatedAt = revokedAt;

  // Atomically consume the token and update credentials
  const updateResult = await MyGlobal.prisma.todo_app_todouser.updateMany({
    where: { id: user.id, password_reset_token: body.token },
    data: {
      password_hash: newHashed,
      password_reset_token: null,
      password_reset_expires_at: null,
      refresh_tokens_revoked_at: revokedAt,
      updated_at: updatedAt,
    },
  });

  if (updateResult.count === 0) {
    throw new HttpException(
      "Invalid or already used password reset token",
      400,
    );
  }

  // Read updated record for response
  const updated = await MyGlobal.prisma.todo_app_todouser.findUniqueOrThrow({
    where: { id: user.id },
  });

  return {
    id: updated.id as string & tags.Format<"uuid">,
    displayName: updated.display_name ?? null,
    isVerified: updated.is_verified,
    status: updated.status ?? undefined,
    createdAt: toISOStringSafe(updated.created_at),
    updatedAt: toISOStringSafe(updated.updated_at),
  };
}
