import { IEcommerceMallSellerDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerDashboard";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerDashboard(props: {
  seller: SellerPayload;
}): Promise<IEcommerceMallSellerDashboard> {
  const sellerId = props.seller.id;
  // 1. Count total products (active, not soft-deleted)
  const totalProducts = await MyGlobal.prisma.ecommerce_mall_products.count({
    where: {
      ecommerce_mall_seller_id: sellerId,
      deleted_at: null,
    },
  });
  // 2. Count total order items for this seller's products
  const totalOrderItems =
    await MyGlobal.prisma.ecommerce_mall_order_items.count({
      where: {
        product: {
          ecommerce_mall_seller_id: sellerId,
        },
      },
    });
  // 3. Count pending cancellation requests
  const pendingCancellationRequests =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.count({
      where: {
        ecommerce_mall_seller_id: sellerId,
        status: "pending",
      },
    });
  // 4. Count pending refund requests
  const pendingRefundRequests =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.count({
      where: {
        ecommerce_mall_seller_id: sellerId,
        status: "pending",
      },
    });
  return {
    totalProducts,
    totalOrderItems,
    pendingCancellationRequests,
    pendingRefundRequests,
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
// import { IEcommerceMallSellerDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerDashboard";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallSellerDashboard(props: {
//   seller: SellerPayload;
// }): Promise<IEcommerceMallSellerDashboard> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------