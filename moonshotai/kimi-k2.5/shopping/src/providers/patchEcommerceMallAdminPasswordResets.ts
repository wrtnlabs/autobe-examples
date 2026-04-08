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
  const nowIso = new Date().toISOString();
  const [customerReset, sellerReset, adminReset] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_customer_password_resets.findUnique({
      where: { token: props.body.token },
    }),
    MyGlobal.prisma.ecommerce_mall_seller_password_resets.findUnique({
      where: { token: props.body.token },
    }),
    MyGlobal.prisma.ecommerce_mall_admin_password_resets.findUnique({
      where: { token: props.body.token },
    }),
  ]);
  if (customerReset === null && sellerReset === null && adminReset === null) {
    throw new HttpException("Password reset token not found", 404);
  }
  if (customerReset !== null) {
    if (customerReset.expires_at.toISOString() < nowIso) {
      throw new HttpException("Password reset token has expired", 410);
    }
    const passwordHash = await PasswordUtil.hash(props.body.password);
    await MyGlobal.prisma.$transaction([
      MyGlobal.prisma.ecommerce_mall_customers.update({
        where: { id: customerReset.customer_id },
        data: { password_hash: passwordHash },
      }),
      MyGlobal.prisma.ecommerce_mall_customer_password_resets.delete({
        where: { id: customerReset.id },
      }),
      MyGlobal.prisma.ecommerce_mall_customer_sessions.deleteMany({
        where: { ecommerce_mall_customer_id: customerReset.customer_id },
      }),
    ]);
  } else if (sellerReset !== null) {
    if (sellerReset.expires_at.toISOString() < nowIso) {
      throw new HttpException("Password reset token has expired", 410);
    }
    const passwordHash = await PasswordUtil.hash(props.body.password);
    await MyGlobal.prisma.$transaction([
      MyGlobal.prisma.ecommerce_mall_sellers.update({
        where: { id: sellerReset.seller_id },
        data: { password_hash: passwordHash },
      }),
      MyGlobal.prisma.ecommerce_mall_seller_password_resets.delete({
        where: { id: sellerReset.id },
      }),
      MyGlobal.prisma.ecommerce_mall_seller_sessions.deleteMany({
        where: { ecommerce_mall_seller_id: sellerReset.seller_id },
      }),
    ]);
  } else if (adminReset !== null) {
    if (adminReset.expired_at.toISOString() < nowIso) {
      throw new HttpException("Password reset token has expired", 410);
    }
    const passwordHash = await PasswordUtil.hash(props.body.password);
    await MyGlobal.prisma.$transaction([
      MyGlobal.prisma.ecommerce_mall_admins.update({
        where: { id: adminReset.admin_id },
        data: { password_hash: passwordHash },
      }),
      MyGlobal.prisma.ecommerce_mall_admin_password_resets.delete({
        where: { id: adminReset.id },
      }),
      MyGlobal.prisma.ecommerce_mall_admin_sessions.deleteMany({
        where: { admin_id: adminReset.admin_id },
      }),
    ]);
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IEcommerceMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerPasswordReset";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallAdminPasswordResets(props: {
//   admin: AdminPayload;
//   body: IEcommerceMallCustomerPasswordReset.IUpdate;
// }): Promise<void> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------