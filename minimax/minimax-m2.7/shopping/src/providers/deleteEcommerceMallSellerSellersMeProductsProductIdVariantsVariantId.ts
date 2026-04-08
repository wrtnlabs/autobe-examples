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

export async function deleteEcommerceMallSellerSellersMeProductsProductIdVariantsVariantId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Verify product ownership
  const product = await MyGlobal.prisma.ecommerce_mall_products.findUnique({
    where: { id: props.productId },
    select: {
      id: true,
      ecommerce_mall_seller_id: true,
    },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }
  if (product.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 2: Verify variant exists and belongs to the product
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUnique({
      where: { id: props.variantId },
      select: {
        id: true,
        ecommerce_mall_product_id: true,
        deleted_at: true,
      },
    });
  if (!variant || variant.ecommerce_mall_product_id !== props.productId) {
    throw new HttpException("Variant not found", 404);
  }
  if (variant.deleted_at !== null) {
    throw new HttpException("Variant not found", 404);
  }
  // Step 3: Check for order items with status 'paid' or 'shipped'
  const orderItemsWithActiveStatus =
    await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
      where: {
        ecommerce_mall_product_variant_id: props.variantId,
        status: { in: ["paid", "shipped"] },
      },
      select: { id: true },
    });
  if (orderItemsWithActiveStatus.length > 0) {
    throw new HttpException("Cannot delete variant with pending orders", 409);
  }
  // Get order item IDs for this variant
  const orderItems = await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
    where: {
      ecommerce_mall_product_variant_id: props.variantId,
    },
    select: { id: true },
  });
  const orderItemIds = orderItems.map((item) => item.id);
  // Check for pending cancellation requests for this variant
  const pendingCancellationRequests =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.count({
      where: {
        ecommerce_mall_order_item_id: { in: orderItemIds },
        status: "pending",
      },
    });
  if (pendingCancellationRequests > 0) {
    throw new HttpException(
      "Cannot delete variant with pending cancellation requests",
      409,
    );
  }
  // Check for pending refund requests for this variant
  const pendingRefundRequests =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.count({
      where: {
        ecommerce_mall_order_item_id: { in: orderItemIds },
        status: "pending",
      },
    });
  if (pendingRefundRequests > 0) {
    throw new HttpException(
      "Cannot delete variant with pending refund requests",
      409,
    );
  }
  // Step 4: Soft delete the variant
  await MyGlobal.prisma.ecommerce_mall_product_variants.update({
    where: { id: props.variantId },
    data: { deleted_at: new Date() },
  });
  // Step 5: Cart cleanup - delete cart items for this variant
  await MyGlobal.prisma.ecommerce_mall_cart_items.deleteMany({
    where: {
      ecommerce_mall_product_variant_id: props.variantId,
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
// export async function deleteEcommerceMallSellerSellersMeProductsProductIdVariantsVariantId(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   variantId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------