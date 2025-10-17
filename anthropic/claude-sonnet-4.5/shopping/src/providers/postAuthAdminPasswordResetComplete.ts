import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function postAuthAdminPasswordResetComplete(props: {
  body: IShoppingMallAdmin.IPasswordReset;
}): Promise<IShoppingMallAdmin.IPasswordResetResponse> {
  const { body } = props;

  // Find admin by password reset token
  const admin = await MyGlobal.prisma.shopping_mall_admins.findFirst({
    where: {
      password_reset_token: body.token,
    },
  });

  // Validate token exists and not expired
  if (!admin || !admin.password_reset_expires_at) {
    throw new HttpException(
      "Password reset link is invalid or has expired",
      400,
    );
  }

  const now = new Date();
  const expiresAt = new Date(admin.password_reset_expires_at);

  if (now > expiresAt) {
    throw new HttpException(
      "Password reset link is invalid or has expired",
      400,
    );
  }

  // Validate new password format
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&#])[A-Za-z\\d@$!%*?&#]{8,}$/;
  if (!passwordRegex.test(body.new_password)) {
    throw new HttpException(
      "Password must be at least 8 characters and contain uppercase, lowercase, digit, and special character (@$!%*?&#)",
      400,
    );
  }

  // Check password history (last 5 passwords)
  let passwordHistory: Array<{ hash: string; changed_at: string }> = [];
  if (admin.password_history) {
    passwordHistory = JSON.parse(admin.password_history);
  }

  // Verify new password against password history
  for (const oldPassword of passwordHistory) {
    const matches = await PasswordUtil.verify(
      body.new_password,
      oldPassword.hash,
    );
    if (matches) {
      throw new HttpException(
        "Password cannot be the same as any of your last 5 passwords",
        400,
      );
    }
  }

  // Hash new password
  const newPasswordHash = await PasswordUtil.hash(body.new_password);

  // Update password history (keep last 5)
  const updatedHistory = [
    {
      hash: newPasswordHash,
      changed_at: toISOStringSafe(new Date()),
    },
    ...passwordHistory,
  ].slice(0, 5);

  const currentTimestamp = toISOStringSafe(new Date());

  // Update admin record
  await MyGlobal.prisma.shopping_mall_admins.update({
    where: { id: admin.id },
    data: {
      password_hash: newPasswordHash,
      password_reset_token: null,
      password_reset_expires_at: null,
      password_changed_at: currentTimestamp,
      password_history: JSON.stringify(updatedHistory),
      updated_at: currentTimestamp,
    },
  });

  // Invalidate all existing sessions for this admin
  await MyGlobal.prisma.shopping_mall_sessions.updateMany({
    where: {
      admin_id: admin.id,
      user_type: "admin",
      is_revoked: false,
    },
    data: {
      is_revoked: true,
      revoked_at: currentTimestamp,
    },
  });

  return {
    message:
      "Password has been successfully reset. Please log in with your new password.",
  };
}
