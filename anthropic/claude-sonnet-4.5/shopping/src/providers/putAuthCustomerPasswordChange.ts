import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putAuthCustomerPasswordChange(props: {
  customer: CustomerPayload;
  body: IShoppingMallCustomer.IPasswordChange;
}): Promise<IShoppingMallCustomer.IPasswordChangeResponse> {
  const { customer, body } = props;

  // Retrieve customer record with password and security fields
  const customerRecord =
    await MyGlobal.prisma.shopping_mall_customers.findUnique({
      where: { id: customer.id },
    });

  if (!customerRecord) {
    throw new HttpException("Customer not found", 404);
  }

  // Verify customer account is active and email is verified
  if (customerRecord.account_status !== "active") {
    throw new HttpException("Account is not active", 403);
  }

  if (!customerRecord.email_verified) {
    throw new HttpException("Email must be verified to change password", 403);
  }

  // Verify current password matches stored hash
  const isCurrentPasswordValid = await PasswordUtil.verify(
    body.current_password,
    customerRecord.password_hash,
  );

  if (!isCurrentPasswordValid) {
    throw new HttpException("Current password is incorrect", 401);
  }

  // Parse password history and check for password reuse
  const passwordHistory: string[] = customerRecord.password_history
    ? JSON.parse(customerRecord.password_history)
    : [];

  // Verify new password doesn't match any of last 5 passwords
  for (const oldHash of passwordHistory) {
    const matchesOldPassword = await PasswordUtil.verify(
      body.new_password,
      oldHash,
    );
    if (matchesOldPassword) {
      throw new HttpException(
        "New password cannot match any of your last 5 passwords",
        400,
      );
    }
  }

  // Hash new password using secure hashing
  const newPasswordHash = await PasswordUtil.hash(body.new_password);

  // Update password history: prepend current hash and limit to 5 entries
  const updatedHistory = [
    customerRecord.password_hash,
    ...passwordHistory,
  ].slice(0, 5);
  const updatedHistoryJson = JSON.stringify(updatedHistory);

  // Update customer password and security metadata
  const now = toISOStringSafe(new Date());

  await MyGlobal.prisma.shopping_mall_customers.update({
    where: { id: customer.id },
    data: {
      password_hash: newPasswordHash,
      password_changed_at: now,
      password_history: updatedHistoryJson,
      updated_at: now,
    },
  });

  // Invalidate all customer sessions for security
  // Note: Ideally would preserve current session, but CustomerPayload doesn't
  // provide session identifier. Invalidating all sessions is more secure.
  await MyGlobal.prisma.shopping_mall_sessions.updateMany({
    where: {
      customer_id: customer.id,
      is_revoked: false,
    },
    data: {
      is_revoked: true,
      revoked_at: now,
    },
  });

  return {
    message:
      "Password changed successfully. All sessions have been invalidated for security. Please log in again with your new password.",
  };
}
