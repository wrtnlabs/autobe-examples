import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

export async function postAuthCustomerPasswordResetComplete(props: {
  body: IShoppingMallCustomer.IPasswordReset;
}): Promise<IShoppingMallCustomer.IPasswordResetResponse> {
  const { body } = props;

  const customer = await MyGlobal.prisma.shopping_mall_customers.findFirst({
    where: {
      password_reset_token: body.token,
    },
  });

  if (!customer) {
    throw new HttpException(
      "Password reset link is invalid or has expired",
      400,
    );
  }

  const nowIsoString = toISOStringSafe(new Date());
  const nowTimestamp = new Date();

  if (
    !customer.password_reset_expires_at ||
    new Date(customer.password_reset_expires_at) < nowTimestamp
  ) {
    throw new HttpException(
      "Password reset link is invalid or has expired",
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
      "Password must contain at least one uppercase letter",
      400,
    );
  }

  if (!/[a-z]/.test(password)) {
    throw new HttpException(
      "Password must contain at least one lowercase letter",
      400,
    );
  }

  if (!/[0-9]/.test(password)) {
    throw new HttpException("Password must contain at least one digit", 400);
  }

  if (!/[@$!%*?&#]/.test(password)) {
    throw new HttpException(
      "Password must contain at least one special character (@$!%*?&#)",
      400,
    );
  }

  if (password.toLowerCase().includes(customer.email.toLowerCase())) {
    throw new HttpException("Password cannot contain your email address", 400);
  }

  let passwordHistory: Array<{ hash: string; changed_at: string }> = [];
  if (customer.password_history) {
    try {
      passwordHistory = JSON.parse(customer.password_history);
    } catch {
      passwordHistory = [];
    }
  }

  for (const historyEntry of passwordHistory.slice(0, 5)) {
    const matches = await PasswordUtil.verify(password, historyEntry.hash);
    if (matches) {
      throw new HttpException(
        "Password cannot be one of your last 5 passwords",
        400,
      );
    }
  }

  const newPasswordHash = await PasswordUtil.hash(password);

  const updatedHistory = [
    { hash: customer.password_hash, changed_at: nowIsoString },
    ...passwordHistory.slice(0, 4),
  ];

  await MyGlobal.prisma.shopping_mall_customers.update({
    where: { id: customer.id },
    data: {
      password_hash: newPasswordHash,
      password_reset_token: null,
      password_reset_expires_at: null,
      password_changed_at: nowIsoString,
      password_history: JSON.stringify(updatedHistory),
      updated_at: nowIsoString,
    },
  });

  await MyGlobal.prisma.shopping_mall_sessions.updateMany({
    where: {
      customer_id: customer.id,
      is_revoked: false,
    },
    data: {
      is_revoked: true,
      revoked_at: nowIsoString,
    },
  });

  return {
    message:
      "Password has been successfully reset. All sessions have been invalidated for security.",
  };
}
