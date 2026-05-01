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

export async function deleteShoppingMallSellerProductsProductIdVariantsVariantId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Verify product exists and is not deleted
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { id: true, shopping_mall_seller_id: true, deleted_at: true },
    });
  if (product.deleted_at !== null) {
    throw new HttpException("Product not found", 404);
  }
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 2: Verify variant exists, is not deleted, and belongs to the product
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      select: { id: true, shopping_mall_product_id: true, deleted_at: true },
    });
  if (variant.deleted_at !== null) {
    throw new HttpException("Variant not found", 404);
  }
  if (variant.shopping_mall_product_id !== props.productId) {
    throw new HttpException("Variant not found", 404);
  }
  // Step 3: Check for pending order items (paid or shipped)
  const pendingOrderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findFirst({
      where: {
        shopping_mall_product_variant_id: props.variantId,
        status: { in: ["paid", "shipped"] },
      },
      select: { id: true },
    });
  if (pendingOrderItem !== null) {
    throw new HttpException("Variant has pending order items", 409);
  }
  // Step 4: Check for pending cancellation requests
  const pendingCancellation =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findFirst({
      where: {
        orderItem: {
          shopping_mall_product_variant_id: props.variantId,
        },
        status: "pending",
        deleted_at: null,
      },
      select: { id: true },
    });
  if (pendingCancellation !== null) {
    throw new HttpException("Variant has pending cancellation requests", 409);
  }
  // Step 5: Check for pending refund requests
  const pendingRefund =
    await MyGlobal.prisma.shopping_mall_refund_requests.findFirst({
      where: {
        orderItem: {
          shopping_mall_product_variant_id: props.variantId,
        },
        status: "pending",
        deleted_at: null,
      },
      select: { id: true },
    });
  if (pendingRefund !== null) {
    throw new HttpException("Variant has pending refund requests", 409);
  }
  // Step 6: Soft-delete variant and hard-delete inventory records in a single transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_product_variants.update({
      where: { id: props.variantId },
      data: { deleted_at: new Date().toISOString() },
    });
    await tx.shopping_mall_inventory_records.deleteMany({
      where: { shopping_mall_product_variant_id: props.variantId },
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
// export async function deleteShoppingMallSellerProductsProductIdVariantsVariantId(props: {
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