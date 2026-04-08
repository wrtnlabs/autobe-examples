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
  // Step 1: Retrieve product and verify ownership
  const product = await MyGlobal.prisma.ecommerce_mall_products.findUnique({
    where: { id: props.productId },
    select: {
      id: true,
      ecommerce_mall_seller_id: true,
      deleted_at: true,
    },
  });
  if (product === null || product.deleted_at !== null) {
    throw new HttpException("Product not found", 404);
  }
  if (product.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 2: Get all variant IDs for this product
  const variants =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findMany({
      where: {
        ecommerce_mall_product_id: props.productId,
        deleted_at: null,
      },
      select: { id: true },
    });
  const variantIds = variants.map((v) => v.id);
  // Step 3: Check for active orders (paid or shipped status)
  if (variantIds.length > 0) {
    const activeOrders =
      await MyGlobal.prisma.ecommerce_mall_order_items.findFirst({
        where: {
          ecommerce_mall_product_variant_id: { in: variantIds },
          status: { in: ["paid", "shipped"] },
        },
        select: { id: true },
      });
    if (activeOrders !== null) {
      throw new HttpException(
        "Cannot delete product with active orders in paid or shipped status",
        400,
      );
    }
    // Step 4: Check for pending cancellation requests
    const orderItems =
      await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
        where: {
          ecommerce_mall_product_variant_id: { in: variantIds },
        },
        select: { id: true },
      });
    const orderItemIds = orderItems.map((o) => o.id);
    if (orderItemIds.length > 0) {
      const pendingCancellations =
        await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findFirst({
          where: {
            ecommerce_mall_order_item_id: { in: orderItemIds },
            status: "pending",
          },
          select: { id: true },
        });
      if (pendingCancellations !== null) {
        throw new HttpException(
          "Cannot delete product with pending cancellation requests",
          400,
        );
      }
      // Step 5: Check for pending refund requests
      const pendingRefunds =
        await MyGlobal.prisma.ecommerce_mall_refund_requests.findFirst({
          where: {
            ecommerce_mall_order_item_id: { in: orderItemIds },
            status: "pending",
            deleted_at: null,
          },
          select: { id: true },
        });
      if (pendingRefunds !== null) {
        throw new HttpException(
          "Cannot delete product with pending refund requests",
          400,
        );
      }
    }
  }
  // Step 6: Atomic cascade deletion within transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Delete inventory records for all variants
    if (variantIds.length > 0) {
      await tx.ecommerce_mall_inventory_records.deleteMany({
        where: {
          ecommerce_mall_product_variant_id: { in: variantIds },
        },
      });
    }
    // Delete cart items referencing these variants
    if (variantIds.length > 0) {
      await tx.ecommerce_mall_cart_items.deleteMany({
        where: {
          ecommerce_mall_product_variant_id: { in: variantIds },
        },
      });
    }
    // Delete wishlist items bookmarking this product
    await tx.ecommerce_mall_wishlist_items.deleteMany({
      where: {
        ecommerce_mall_product_id: props.productId,
      },
    });
    // Delete product images
    await tx.ecommerce_mall_product_images.deleteMany({
      where: {
        product_id: props.productId,
      },
    });
    // Soft delete all variants
    await tx.ecommerce_mall_product_variants.updateMany({
      where: {
        ecommerce_mall_product_id: props.productId,
        deleted_at: null,
      },
      data: {
        deleted_at: toISOStringSafe(new Date()),
      },
    });
    // Soft delete the product
    await tx.ecommerce_mall_products.update({
      where: { id: props.productId },
      data: {
        deleted_at: toISOStringSafe(new Date()),
      },
    });
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