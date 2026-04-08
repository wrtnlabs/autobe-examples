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

export async function deleteEcommerceMallSellerSellerAccount(props: {
  seller: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "seller";
  };
}): Promise<void> {
  const sellerId = props.seller.id;
  // Check for pending order items with 'paid' or 'shipped' status
  const pendingOrderItems =
    await MyGlobal.prisma.ecommerce_mall_order_items.findFirst({
      where: {
        status: { in: ["paid", "shipped"] },
        product: {
          ecommerce_mall_seller_id: sellerId,
        },
      },
    });
  if (pendingOrderItems !== null) {
    throw new HttpException(
      "Cannot delete seller account: there are pending orders with paid or shipped status",
      409,
    );
  }
  // Check for pending cancellation requests
  const pendingCancellationRequests =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findFirst({
      where: {
        ecommerce_mall_seller_id: sellerId,
        status: "pending",
      },
    });
  if (pendingCancellationRequests !== null) {
    throw new HttpException(
      "Cannot delete seller account: there are pending cancellation requests",
      409,
    );
  }
  // Check for pending refund requests
  const pendingRefundRequests =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.findFirst({
      where: {
        ecommerce_mall_seller_id: sellerId,
        status: "pending",
      },
    });
  if (pendingRefundRequests !== null) {
    throw new HttpException(
      "Cannot delete seller account: there are pending refund requests",
      409,
    );
  }
  // All conditions passed - perform soft delete in transaction
  const deletedAt = toISOStringSafe(new Date());
  await MyGlobal.prisma.$transaction([
    // Soft delete the seller
    MyGlobal.prisma.ecommerce_mall_sellers.update({
      where: { id: sellerId },
      data: { deleted_at: deletedAt },
    }),
    // Soft delete all products owned by the seller
    MyGlobal.prisma.ecommerce_mall_products.updateMany({
      where: { ecommerce_mall_seller_id: sellerId },
      data: { deleted_at: deletedAt },
    }),
  ]);
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
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function deleteEcommerceMallSellerSellerAccount(props: {
//   seller: SellerPayload;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------