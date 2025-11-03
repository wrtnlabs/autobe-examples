import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";

export async function postAuthCustomerPasswordReset(props: {
  body: IShoppingCustomer.ICompletePasswordReset;
}): Promise<IShoppingCustomer.IPasswordResetCompleted> {
  const { reset_code, new_password } = props.body;

  // Step 1: Lookup password reset record by code
  const reset = await MyGlobal.prisma.shopping_password_resets.findUnique({
    where: { reset_code },
  });
  if (!reset) throw new HttpException("Invalid or expired reset token", 404);
  if (reset.consumed_at !== null)
    throw new HttpException("Reset token has already been used", 400);
  const now = toISOStringSafe(new Date());
  if (new Date(reset.expires_at) < new Date(now))
    throw new HttpException("Reset token has expired", 400);

  // Step 2: Password strength validation (min 8 chars, upper, lower, number, symbol)
  if (
    !/^.*(?=.{8,})(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).*$/.test(
      new_password,
    )
  ) {
    throw new HttpException(
      "Password does not meet complexity requirements",
      400,
    );
  }

  // Step 3: Find customer
  const customerId = reset.shopping_customer_id;
  const customer = await MyGlobal.prisma.shopping_customers.findUnique({
    where: { id: customerId ?? undefined },
  });
  if (!customer)
    throw new HttpException("Customer not found for password reset", 404);

  // Step 4: Securely hash new password
  const hash = await PasswordUtil.hash(new_password);

  // Step 5 (atomic): Update password and mark reset token consumed
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.shopping_customers.update({
      where: { id: customerId ?? undefined },
      data: { password_hash: hash, updated_at: now },
    }),
    MyGlobal.prisma.shopping_password_resets.update({
      where: { reset_code },
      data: { consumed_at: now, updated_at: now },
    }),
  ]);

  return {
    success: true,
    customer_id: (customerId ?? "") satisfies string as string &
      tags.Format<"uuid">,
    reset_token_consumed_at: now,
  };
}
