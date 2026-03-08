import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministratorPasswordResets(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallCustomerPasswordReset.IVerify;
}): Promise<IShoppingMallCustomerPasswordReset.IVerified> {
  const now = new Date();
  const newPasswordHash = await PasswordUtil.hash(props.body.newPassword);
  // Try customer password reset
  const customerReset =
    await MyGlobal.prisma.shopping_mall_customer_password_resets.findFirst({
      where: {
        token: props.body.token,
        used_at: null,
      },
    });
  if (customerReset !== null) {
    if (customerReset.expires_at < now) {
      throw new HttpException("Token expired", 410);
    }
    await MyGlobal.prisma.$transaction([
      MyGlobal.prisma.shopping_mall_customers.update({
        where: { id: customerReset.shopping_mall_customer_id },
        data: {
          password_hash: newPasswordHash,
          updated_at: now,
        },
      }),
      MyGlobal.prisma.shopping_mall_customer_password_resets.update({
        where: { id: customerReset.id },
        data: { used_at: now },
      }),
    ]);
    return {
      role: "customer",
      id: customerReset.shopping_mall_customer_id,
    } satisfies IShoppingMallCustomerPasswordReset.IVerified;
  }
  // Try seller password reset
  const sellerReset =
    await MyGlobal.prisma.shopping_mall_seller_password_resets.findFirst({
      where: {
        token: props.body.token,
      },
    });
  if (sellerReset !== null) {
    if (sellerReset.expired_at < now) {
      throw new HttpException("Token expired", 410);
    }
    await MyGlobal.prisma.$transaction([
      MyGlobal.prisma.shopping_mall_sellers.update({
        where: { id: sellerReset.seller_id },
        data: {
          password_hash: newPasswordHash,
          updated_at: now,
        },
      }),
      MyGlobal.prisma.shopping_mall_seller_password_resets.update({
        where: { id: sellerReset.id },
        data: { expired_at: now },
      }),
    ]);
    return {
      role: "seller",
      id: sellerReset.seller_id,
    } satisfies IShoppingMallCustomerPasswordReset.IVerified;
  }
  // Try administrator password reset (uses 'code' field, not 'token')
  const adminReset =
    await MyGlobal.prisma.shopping_mall_administrator_password_resets.findFirst(
      {
        where: {
          code: props.body.token,
          used_at: null,
        },
      },
    );
  if (adminReset !== null) {
    if (adminReset.expires_at < now) {
      throw new HttpException("Token expired", 410);
    }
    await MyGlobal.prisma.$transaction([
      MyGlobal.prisma.shopping_mall_administrators.update({
        where: { id: adminReset.shopping_mall_administrator_id },
        data: {
          password_hash: newPasswordHash,
          updated_at: now,
        },
      }),
      MyGlobal.prisma.shopping_mall_administrator_password_resets.update({
        where: { id: adminReset.id },
        data: { used_at: now },
      }),
    ]);
    return {
      role: "administrator",
      id: adminReset.shopping_mall_administrator_id,
    } satisfies IShoppingMallCustomerPasswordReset.IVerified;
  }
  throw new HttpException("Token not found", 404);
}
