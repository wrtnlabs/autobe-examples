import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSuperAdminAdminDashboard(props: {
  superAdmin: SuperadminPayload;
}): Promise<IEcommerceMallAdmin.IDashboard> {
  // Count all customers (excluding soft-deleted)
  const customersCount = await MyGlobal.prisma.ecommerce_mall_customers.count({
    where: { deleted_at: null },
  });
  // Count all sellers (excluding soft-deleted)
  const sellersCount = await MyGlobal.prisma.ecommerce_mall_sellers.count({
    where: { deleted_at: null },
  });
  // Count approved sellers only
  const approvedSellersCount =
    await MyGlobal.prisma.ecommerce_mall_sellers.count({
      where: { deleted_at: null, approval_status: "approved" },
    });
  // Count all products (excluding soft-deleted)
  const productsCount = await MyGlobal.prisma.ecommerce_mall_products.count({
    where: { deleted_at: null },
  });
  // Count all orders (excluding soft-deleted)
  const ordersCount = await MyGlobal.prisma.ecommerce_mall_orders.count({
    where: { deleted_at: null },
  });
  // Count pending seller approvals
  const pendingSellerApprovalsCount =
    await MyGlobal.prisma.ecommerce_mall_seller_approvals.count({
      where: { status: "pending" },
    });
  // Count pending admin requests
  const pendingAdminRequestsCount =
    await MyGlobal.prisma.ecommerce_mall_admin_requests.count({
      where: { status: "pending" },
    });
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
// export async function getEcommerceMallSuperAdminAdminDashboard(props: {
//   superAdmin: SuperadminPayload;
// }): Promise<IEcommerceMallAdmin.IDashboard> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------