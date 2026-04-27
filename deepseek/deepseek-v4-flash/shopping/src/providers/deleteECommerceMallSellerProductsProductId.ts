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

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function deleteECommerceMallSellerProductsProductId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<void> {
  const now: string = new Date().toISOString();
  // 1. Find the product or throw 404
  const product =
    await MyGlobal.prisma.e_commerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { id: true, seller_id: true },
    });
  // 2. Ownership check — only the owning seller can delete their product
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Verify seller is approved (section 275 — approval required for product management)
  const seller =
    await MyGlobal.prisma.e_commerce_mall_sellers.findUniqueOrThrow({
      where: { id: props.seller.id },
      select: { approval_status: true },
    });
  if (seller.approval_status !== "approved") {
    throw new HttpException(
      "Seller approval is required before managing products",
      403,
    );
  }
  // 4. Get all variant IDs for this product
  const variants =
    await MyGlobal.prisma.e_commerce_mall_product_variants.findMany({
      where: { e_commerce_mall_product_id: props.productId },
      select: { id: true },
    });
  const variantIdList: string[] = variants.map((v) => v.id);
  // 5. Prerequisite checks only if variants exist
  if (variantIdList.length > 0) {
    // 5a. Check no order items in 'paid' or 'shipped' status
    const activeOrderItems =
      await MyGlobal.prisma.e_commerce_mall_order_items.findMany({
        where: {
          e_commerce_mall_product_variant_id: { in: variantIdList },
          status: { in: ["paid", "shipped"] },
          deleted_at: null,
        },
        select: { id: true },
        take: 1,
      });
    if (activeOrderItems.length > 0) {
      throw new HttpException(
        "Cannot delete product with active order items",
        409,
      );
    }
    // 5b. Check no pending cancellation requests
    const pendingCancellations =
      await MyGlobal.prisma.e_commerce_mall_cancellation_requests.findMany({
        where: {
          orderItem: {
            e_commerce_mall_product_variant_id: { in: variantIdList },
          },
          status: { in: ["pending", "approved"] },
          deleted_at: null,
        },
        select: { id: true },
        take: 1,
      });
    if (pendingCancellations.length > 0) {
      throw new HttpException(
        "Cannot delete product with pending cancellation requests",
        409,
      );
    }
    // 5c. Check no pending refund requests
    const pendingRefunds =
      await MyGlobal.prisma.e_commerce_mall_refund_requests.findMany({
        where: {
          orderItem: {
            e_commerce_mall_product_variant_id: { in: variantIdList },
          },
          status: "pending",
          deleted_at: null,
        },
        select: { id: true },
        take: 1,
      });
    if (pendingRefunds.length > 0) {
      throw new HttpException(
        "Cannot delete product with pending refund requests",
        409,
      );
    }
  }
  // 6. Soft-delete the product via UPDATE (cascade never fires — snapshots preserved)
  await MyGlobal.prisma.e_commerce_mall_products.update({
    where: { id: props.productId },
    data: {
      visibility: "deleted",
      deleted_at: now,
      updated_at: now,
    },
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
// export async function deleteECommerceMallSellerProductsProductId(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------