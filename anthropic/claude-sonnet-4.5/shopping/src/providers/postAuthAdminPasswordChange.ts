import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postAuthAdminPasswordChange(props: {
  admin: AdminPayload;
  body: IShoppingMallAdmin.IPasswordChange;
}): Promise<IShoppingMallAdmin.IPasswordChangeResponse> {
  const { admin, body } = props;

  // Fetch admin record
  const adminRecord =
    await MyGlobal.prisma.shopping_mall_admins.findUniqueOrThrow({
      where: { id: admin.id },
    });

  // Verify current password
  const isCurrentPasswordValid = await PasswordUtil.verify(
    body.current_password,
    adminRecord.password_hash,
  );
  if (!isCurrentPasswordValid) {
    throw new HttpException("Current password is incorrect", 401);
  }

  // Check new password is different from current
  const isSameAsCurrent = await PasswordUtil.verify(
    body.new_password,
    adminRecord.password_hash,
  );
  if (isSameAsCurrent) {
    throw new HttpException(
      "New password must be different from current password",
      400,
    );
  }

  // Parse password history and check against last 5 passwords
  const passwordHistory: Array<{ hash: string; changed_at: string }> =
    adminRecord.password_history
      ? JSON.parse(adminRecord.password_history)
      : [];

  for (const entry of passwordHistory) {
    const matchesHistorical = await PasswordUtil.verify(
      body.new_password,
      entry.hash,
    );
    if (matchesHistorical) {
      throw new HttpException(
        "Password cannot be the same as any of your last 5 passwords",
        400,
      );
    }
  }

  // Hash new password
  const newPasswordHash = await PasswordUtil.hash(body.new_password);

  // Update password history: prepend new entry and keep last 5
  const now = toISOStringSafe(new Date());
  const newHistoryEntry = { hash: newPasswordHash, changed_at: now };
  const updatedHistory = [newHistoryEntry, ...passwordHistory].slice(0, 5);

  // Update admin record
  await MyGlobal.prisma.shopping_mall_admins.update({
    where: { id: admin.id },
    data: {
      password_hash: newPasswordHash,
      password_changed_at: now,
      password_history: JSON.stringify(updatedHistory),
    },
  });

  // Revoke all sessions for this admin for security
  await MyGlobal.prisma.shopping_mall_sessions.updateMany({
    where: {
      admin_id: admin.id,
      user_type: "admin",
      is_revoked: false,
    },
    data: {
      is_revoked: true,
      revoked_at: now,
    },
  });

  return {
    message:
      "Password changed successfully. All sessions have been terminated for security.",
  };
}
