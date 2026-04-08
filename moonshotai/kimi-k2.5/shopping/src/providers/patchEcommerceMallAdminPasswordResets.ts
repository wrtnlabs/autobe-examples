import { IEcommerceMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminPasswordResets(props: {
  admin: AdminPayload;
  body: IEcommerceMallCustomerPasswordReset.IUpdate;
}): Promise<void> {
  const now = new Date().toISOString();
  // Try to find token in customer password resets
  const customerToken =
    await MyGlobal.prisma.ecommerce_mall_customer_password_resets.findUnique({
      where: { token: props.body.token },
    });
  // Try to find token in seller password resets
  const sellerToken =
    await MyGlobal.prisma.ecommerce_mall_seller_password_resets.findUnique({
      where: { token: props.body.token },
    });
  // Try to find token in admin password resets
  const adminToken =
    await MyGlobal.prisma.ecommerce_mall_admin_password_resets.findUnique({
      where: { token: props.body.token },
    });
  // Check which token was found
  if (customerToken !== null) {
    // Check if customer token expired
    if (new Date(customerToken.expires_at) < new Date(now)) {
      throw new HttpException("Token has expired", 410);
    }
    // Hash new password
    const passwordHash = await PasswordUtil.hash(props.body.password);
    // Update customer password, delete token, and delete sessions in transaction
    await MyGlobal.prisma.$transaction(async (tx) => {
      // Update customer password
      await tx.ecommerce_mall_customers.update({
        where: { id: customerToken.customer_id },
        data: { password_hash: passwordHash, updated_at: new Date(now) },
      });
      // Delete the used token
      await tx.ecommerce_mall_customer_password_resets.delete({
        where: { id: customerToken.id },
      });
      // Delete all sessions for this customer
      await tx.ecommerce_mall_customer_sessions.deleteMany({
        where: { ecommerce_mall_customer_id: customerToken.customer_id },
      });
    });
  } else if (sellerToken !== null) {
    // Check if seller token expired
    if (new Date(sellerToken.expires_at) < new Date(now)) {
      throw new HttpException("Token has expired", 410);
    }
    // Hash new password
    const passwordHash = await PasswordUtil.hash(props.body.password);
    // Update seller password, delete token, and delete sessions in transaction
    await MyGlobal.prisma.$transaction(async (tx) => {
      // Update seller password
      await tx.ecommerce_mall_sellers.update({
        where: { id: sellerToken.seller_id },
        data: { password_hash: passwordHash, updated_at: new Date(now) },
      });
      // Delete the used token
      await tx.ecommerce_mall_seller_password_resets.delete({
        where: { id: sellerToken.id },
      });
      // Delete all sessions for this seller
      await tx.ecommerce_mall_seller_sessions.deleteMany({
        where: { ecommerce_mall_seller_id: sellerToken.seller_id },
      });
    });
  } else if (adminToken !== null) {
    // Check if admin token expired
    if (new Date(adminToken.expired_at) < new Date(now)) {
      throw new HttpException("Token has expired", 410);
    }
    // Hash new password
    const passwordHash = await PasswordUtil.hash(props.body.password);
    // Update admin password, delete token, and delete sessions in transaction
    await MyGlobal.prisma.$transaction(async (tx) => {
      // Update admin password
      await tx.ecommerce_mall_admins.update({
        where: { id: adminToken.admin_id },
        data: { password_hash: passwordHash, updated_at: new Date(now) },
      });
      // Delete the used token
      await tx.ecommerce_mall_admin_password_resets.delete({
        where: { id: adminToken.id },
      });
      // Delete all sessions for this admin
      await tx.ecommerce_mall_admin_sessions.deleteMany({
        where: { admin_id: adminToken.admin_id },
      });
    });
  } else {
    // Token not found in any table
    throw new HttpException("Invalid or expired token", 404);
  }
}
