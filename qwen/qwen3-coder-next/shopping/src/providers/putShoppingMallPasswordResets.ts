import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallCustomerTransformer } from "../transformers/ShoppingMallCustomerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallPasswordResets(props: {
  body: IShoppingMallCustomerPasswordReset.IRequest;
}): Promise<IShoppingMallCustomer> {
  const { token_hash, new_password } = props.body;
  // 1. Find the password reset record with matching token_hash and status='pending'
  const passwordReset =
    await MyGlobal.prisma.shopping_mall_customer_password_resets.findFirst({
      where: {
        token_hash,
        status: "pending",
      },
    });
  if (!passwordReset) {
    throw new HttpException(
      "Password reset token not found or already used",
      404,
    );
  }
  // 2. Verify token has not expired
  const now = toISOStringSafe(new Date());
  if (new Date(passwordReset.expires_at) <= new Date(now)) {
    throw new HttpException("Password reset token has expired", 400);
  }
  // 3. Find the customer record
  const customer =
    await MyGlobal.prisma.shopping_mall_customers.findUniqueOrThrow({
      where: { id: passwordReset.shopping_mall_customer_id },
    });
  // 4. Validate new password meets security requirements
  if (new_password.length < 8) {
    throw new HttpException("New password must be at least 8 characters", 422);
  }
  // 5. Hash new password using bcrypt with cost factor 12
  const hashedPassword = await PasswordUtil.hash(new_password);
  // 6. Update customer's password hash
  await MyGlobal.prisma.shopping_mall_customers.update({
    where: { id: customer.id },
    data: {
      password_hash: hashedPassword,
      updated_at: now,
    },
  });
  // 7. Mark password reset record as 'used'
  await MyGlobal.prisma.shopping_mall_customer_password_resets.update({
    where: { id: passwordReset.id },
    data: {
      status: "used",
      used_at: now,
    },
  });
  // 8. Delete any other pending password reset tokens for the same customer
  await MyGlobal.prisma.shopping_mall_customer_password_resets.deleteMany({
    where: {
      customer: {
        id: customer.id,
      },
      status: "pending",
    },
  });
  // 9. Return customer profile information
  return await ShoppingMallCustomerTransformer.transform(customer);
}
