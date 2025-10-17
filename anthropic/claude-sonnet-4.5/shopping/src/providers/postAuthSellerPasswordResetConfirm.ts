import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function postAuthSellerPasswordResetConfirm(props: {
  body: IShoppingMallSeller.IPasswordResetConfirm;
}): Promise<IShoppingMallSeller.IPasswordResetConfirmResponse> {
  const { body } = props;

  const seller = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
    where: {
      password_reset_token: body.token,
    },
  });

  if (!seller || !seller.password_reset_expires_at) {
    throw new HttpException(
      "Password reset link is invalid or has expired. Please request a new password reset",
      400,
    );
  }

  const nowTimestamp: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  const expiresAtTimestamp: string & tags.Format<"date-time"> = toISOStringSafe(
    seller.password_reset_expires_at,
  );

  if (expiresAtTimestamp <= nowTimestamp) {
    throw new HttpException(
      "Password reset link is invalid or has expired. Please request a new password reset",
      400,
    );
  }

  const password = body.new_password;

  if (password.length < 8 || password.length > 128) {
    throw new HttpException(
      "Password must be between 8 and 128 characters",
      400,
    );
  }

  if (!/[A-Z]/.test(password)) {
    throw new HttpException(
      "Password must contain at least one uppercase letter (A-Z)",
      400,
    );
  }

  if (!/[a-z]/.test(password)) {
    throw new HttpException(
      "Password must contain at least one lowercase letter (a-z)",
      400,
    );
  }

  if (!/[0-9]/.test(password)) {
    throw new HttpException(
      "Password must contain at least one digit (0-9)",
      400,
    );
  }

  if (!/[@$!%*?&#]/.test(password)) {
    throw new HttpException(
      "Password must contain at least one special character (@, $, !, %, *, ?, &, #)",
      400,
    );
  }

  if (password.toLowerCase() === seller.email.toLowerCase()) {
    throw new HttpException("Password cannot match your email address", 400);
  }

  const passwordHistory: Array<{ hash: string; changed_at: string }> =
    seller.password_history ? JSON.parse(seller.password_history) : [];

  for (const historyEntry of passwordHistory) {
    const matches = await PasswordUtil.verify(password, historyEntry.hash);
    if (matches) {
      throw new HttpException(
        "This password was recently used. Please choose a different password",
        400,
      );
    }
  }

  const matchesCurrent = await PasswordUtil.verify(
    password,
    seller.password_hash,
  );
  if (matchesCurrent) {
    throw new HttpException(
      "This password was recently used. Please choose a different password",
      400,
    );
  }

  const newPasswordHash = await PasswordUtil.hash(password);

  const updatedHistory = [
    ...passwordHistory,
    {
      hash: seller.password_hash,
      changed_at: nowTimestamp,
    },
  ].slice(-5);

  await MyGlobal.prisma.shopping_mall_sellers.update({
    where: { id: seller.id },
    data: {
      password_hash: newPasswordHash,
      password_changed_at: nowTimestamp,
      password_history: JSON.stringify(updatedHistory),
      password_reset_token: null,
      password_reset_expires_at: null,
    },
  });

  await MyGlobal.prisma.shopping_mall_sessions.updateMany({
    where: {
      seller_id: seller.id,
      is_revoked: false,
    },
    data: {
      is_revoked: true,
      revoked_at: nowTimestamp,
    },
  });

  return {
    message:
      "Password has been successfully reset. Please log in with your new password.",
  };
}
