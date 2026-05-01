import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSellerDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerDashboard";
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

export async function getShoppingMallSellerDashboard(props: {
  seller: SellerPayload;
}): Promise<IShoppingMallSellerDashboard> {
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow({
    where: { id: props.seller.id },
    select: { id: true, approval_status: true },
  });
  if (seller.approval_status !== "approved") {
    throw new HttpException("Seller is not approved", 403);
  }
  const products_count = await MyGlobal.prisma.shopping_mall_products.count({
    where: {
      shopping_mall_seller_id: props.seller.id,
      deleted_at: null,
    },
  });
  const order_items_count =
    await MyGlobal.prisma.shopping_mall_order_items.count({
      where: {
        productVariant: {
          product: {
            shopping_mall_seller_id: props.seller.id,
            deleted_at: null,
          },
        },
      },
    });
  const pending_cancellations_count =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.count({
      where: {
        status: "pending",
        deleted_at: null,
        orderItem: {
          productVariant: {
            product: {
              shopping_mall_seller_id: props.seller.id,
              deleted_at: null,
            },
          },
        },
      },
    });
  const pending_refunds_count =
    await MyGlobal.prisma.shopping_mall_refund_requests.count({
      where: {
        status: "pending",
        deleted_at: null,
        orderItem: {
          productVariant: {
            product: {
              shopping_mall_seller_id: props.seller.id,
              deleted_at: null,
            },
          },
        },
      },
    });
  return {
    products_count,
    order_items_count,
    pending_cancellations_count,
    pending_refunds_count,
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
// import { IShoppingMallSellerDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerDashboard";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getShoppingMallSellerDashboard(props: {
//   seller: SellerPayload;
// }): Promise<IShoppingMallSellerDashboard> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------