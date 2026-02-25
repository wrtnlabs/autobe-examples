import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
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

export async function putShoppingMallEmailVerificationsToken(props: {
  token: string;
}): Promise<IShoppingMallCustomer> {
  // Find the verification token
  const verification =
    await MyGlobal.prisma.shopping_mall_customer_email_verifications.findUnique(
      {
        where: { token: props.token },
      },
    );
  // Validate token exists
  if (!verification) {
    throw new HttpException("Invalid verification token", 400);
  }
  // Validate token not expired
  const now = new Date();
  if (verification.expires_at <= now) {
    throw new HttpException("Verification token has expired", 400);
  }
  // Validate token not already used
  if (verification.used_at !== null) {
    throw new HttpException("Verification token has already been used", 400);
  }
  // Mark token as used
  await MyGlobal.prisma.shopping_mall_customer_email_verifications.update({
    where: { id: verification.id },
    data: {
      used_at: toISOStringSafe(now),
    },
  });
  // Update customer's email verification status
  const updatedCustomer = await MyGlobal.prisma.shopping_mall_customers.update({
    where: { id: verification.shopping_mall_customer_id },
    data: {
      email_verified: true,
    },
  });
  // Transform to response DTO
  return ShoppingMallCustomerTransformer.transform(updatedCustomer);
}
