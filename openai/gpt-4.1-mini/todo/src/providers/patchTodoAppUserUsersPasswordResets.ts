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
import { ITodoAppUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserPasswordReset";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoAppUserUsersPasswordResets(props: {
  user: UserPayload;
  body: ITodoAppUserPasswordReset.IRequest;
}): Promise<void> {
  // Find the reset request by token ensuring it is valid (not expired, not deleted)
  const resetRequest =
    await MyGlobal.prisma.todo_app_user_password_resets.findFirst({
      where: {
        token: props.body.token,
        expires_at: { gt: toISOStringSafe(new Date()) },
        deleted_at: null,
      },
    });
  if (resetRequest === null) {
    throw new HttpException("Invalid or expired reset token.", 400);
  }
  // Hash the new password
  const hashedPassword = await PasswordUtil.hash(props.body.password);
  // Update the user's password
  await MyGlobal.prisma.todo_app_users.update({
    where: { id: resetRequest.todo_app_user_id },
    data: {
      password_hash: hashedPassword,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // Invalidate the used reset token by setting deleted_at
  const nowISOString = toISOStringSafe(new Date());
  await MyGlobal.prisma.todo_app_user_password_resets.update({
    where: { id: resetRequest.id },
    data: {
      deleted_at: nowISOString,
      updated_at: nowISOString,
    },
  });
}
