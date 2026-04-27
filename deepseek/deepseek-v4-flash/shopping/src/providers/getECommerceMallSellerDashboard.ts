import { IECommerceMallSellerDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerDashboard";
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

export async function getECommerceMallSellerDashboard(props: {
  seller: SellerPayload;
}): Promise<IECommerceMallSellerDashboard> {
  const sellerId = props.seller.id;
  const [
    totalProducts,
    totalOrderItems,
    pendingCancellationRequests,
    pendingRefundRequests,
  ] = await Promise.all([
    MyGlobal.prisma.e_commerce_mall_products.count({
      where: {
        seller_id: sellerId,
        deleted_at: null,
      },
    }),
    MyGlobal.prisma.e_commerce_mall_order_items.count({
      where: {
        productVariant: {
          product: {
            seller_id: sellerId,
          },
        },
      },
    }),
    MyGlobal.prisma.e_commerce_mall_cancellation_requests.count({
      where: {
        status: "pending",
        orderItem: {
          productVariant: {
            product: {
              seller_id: sellerId,
            },
          },
        },
      },
    }),
    MyGlobal.prisma.e_commerce_mall_refund_requests.count({
      where: {
        status: "pending",
        orderItem: {
          productVariant: {
            product: {
              seller_id: sellerId,
            },
          },
        },
      },
    }),
  ]);
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
// import { IECommerceMallSellerDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerDashboard";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getECommerceMallSellerDashboard(props: {
//   seller: SellerPayload;
// }): Promise<IECommerceMallSellerDashboard> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------