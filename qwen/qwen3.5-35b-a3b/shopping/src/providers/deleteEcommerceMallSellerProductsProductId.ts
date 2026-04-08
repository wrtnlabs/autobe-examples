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

export async function deleteEcommerceMallSellerProductsProductId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<void> {
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId, seller_id: props.seller.id },
      select: { id: true, deleted_at: true },
    });
  if (product.deleted_at !== null) {
    throw new HttpException("Product already deleted", 409);
  }
  const variants =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findMany({
      where: { product_id: props.productId, deleted_at: null },
      select: { id: true },
    });
  const variantIds = variants.map((v) => v.id);
  if (variantIds.length > 0) {
    const blockingOrderItems =
      await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
        where: {
          ecommerce_mall_product_variant_id: { in: variantIds },
          status: { in: ["paid", "shipped"] },
          deleted_at: null,
        },
        select: { id: true },
      });
    if (blockingOrderItems.length > 0) {
      throw new HttpException(
        "Cannot delete product with active order items",
        409,
      );
    }
    const orderItemIds = blockingOrderItems.map((oi) => oi.id);
    const pendingCancellationRequests =
      await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findMany({
        where: {
          ecommerce_mall_order_item_id: { in: orderItemIds },
          status: "pending",
          deleted_at: null,
        },
        select: { id: true },
      });
    if (pendingCancellationRequests.length > 0) {
      throw new HttpException(
        "Cannot delete product with pending cancellation requests",
        409,
      );
    }
    const pendingRefundRequests =
      await MyGlobal.prisma.ecommerce_mall_refund_requests.findMany({
        where: {
          order_item_id: { in: orderItemIds },
          status: "pending",
          deleted_at: null,
        },
        select: { id: true },
      });
    if (pendingRefundRequests.length > 0) {
      throw new HttpException(
        "Cannot delete product with pending refund requests",
        409,
      );
    }
  }
  await MyGlobal.prisma.ecommerce_mall_products.update({
    where: { id: props.productId },
    data: { deleted_at: new Date() },
  });
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
// export async function deleteEcommerceMallSellerProductsProductId(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------