import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putAuthUserChangePassword(props: {
  user: UserPayload;
  body: ITodoAppUser.IChangePassword;
}): Promise<ITodoAppUser.IProfile> {
  const { user, body } = props;

  // Owner-initiated change (currentPassword + newPassword)
  if ("currentPassword" in body && body.currentPassword !== undefined) {
    const dbUser = await MyGlobal.prisma.todo_app_user.findUniqueOrThrow({
      where: { id: user.id },
    });

    if (dbUser.password_hash === null) {
      throw new HttpException("No password is set for this account", 400);
    }

    const verified = await PasswordUtil.verify(
      body.currentPassword,
      dbUser.password_hash,
    );
    if (!verified) throw new HttpException("Invalid current password", 403);

    const hashed = await PasswordUtil.hash(body.newPassword);
    const now = toISOStringSafe(new Date());

    const updated = await MyGlobal.prisma.todo_app_user.update({
      where: { id: user.id },
      data: {
        password_hash: hashed,
        updated_at: now,
        last_active_at: now,
      },
      select: {
        id: true,
        email: true,
        display_name: true,
        account_status: true,
        created_at: true,
        updated_at: true,
        last_active_at: true,
      },
    });

    return {
      id: updated.id,
      email: updated.email,
      display_name: updated.display_name ?? null,
      account_status: updated.account_status,
      created_at: toISOStringSafe(updated.created_at),
      updated_at: toISOStringSafe(updated.updated_at),
      last_active_at: updated.last_active_at
        ? toISOStringSafe(updated.last_active_at)
        : null,
    };
  }

  // Reset-token variant cannot be implemented without token storage/schema
  if ("resetToken" in body && body.resetToken !== undefined) {
    throw new HttpException("Password reset via token is not supported", 400);
  }

  throw new HttpException("Invalid change-password payload", 400);
}
