import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
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

export async function getEcommerceMallAdminAdminDashboard(props: {
  admin: AdminPayload;
}): Promise<IEcommerceMallAdmin.IDashboard> {
  const [
    customersCount,
    sellersCount,
    approvedSellersCount,
    productsCount,
    ordersCount,
    pendingSellerApprovalsCount,
    pendingAdminRequestsCount,
  ] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_customers.count({
      where: { deleted_at: null },
    }),
    MyGlobal.prisma.ecommerce_mall_sellers.count({
      where: { deleted_at: null },
    }),
    MyGlobal.prisma.ecommerce_mall_sellers.count({
      where: { deleted_at: null, approval_status: "approved" },
    }),
    MyGlobal.prisma.ecommerce_mall_products.count({
      where: { deleted_at: null },
    }),
    MyGlobal.prisma.ecommerce_mall_orders.count({
      where: { deleted_at: null },
    }),
    MyGlobal.prisma.ecommerce_mall_seller_approvals.count({
      where: { status: "pending" },
    }),
    MyGlobal.prisma.ecommerce_mall_admin_requests.count({
      where: { status: "pending" },
    }),
  ]);
  return {
    customersCount,
    sellersCount,
    approvedSellersCount,
    productsCount,
    ordersCount,
    pendingSellerApprovalsCount,
    pendingAdminRequestsCount,
  };
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
// import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallAdminAdminDashboard(props: {
//   admin: AdminPayload;
// }): Promise<IEcommerceMallAdmin.IDashboard> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------