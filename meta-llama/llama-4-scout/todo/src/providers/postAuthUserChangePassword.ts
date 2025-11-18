import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postAuthUserChangePassword(props: {
  user: UserPayload;
  body: ITodoListUser.IChangePassword;
}): Promise<ITodoListUser.IChangePasswordResult> {
  const { user, body } = props;

  // Lookup current user by id, only if active, verified, not deleted
  const existing = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { id: user.id },
  });

  if (
    !existing ||
    existing.is_active !== true ||
    existing.is_verified !== true ||
    existing.deleted_at !== null
  ) {
    return {
      success: false,
      reason: "Account inactive, unverified, or not found.",
    };
  }

  // Securely verify old password
  const passwordOk = await PasswordUtil.verify(
    body.old_password,
    existing.password_hash,
  );
  if (!passwordOk) {
    return {
      success: false,
      reason: "Incorrect current password",
    };
  }

  // Hash new password
  const newHash = await PasswordUtil.hash(body.new_password);
  const updated_at = toISOStringSafe(new Date());
  // Save update atomically
  await MyGlobal.prisma.todo_list_users.update({
    where: { id: user.id },
    data: { password_hash: newHash, updated_at },
  });

  return { success: true };
}
