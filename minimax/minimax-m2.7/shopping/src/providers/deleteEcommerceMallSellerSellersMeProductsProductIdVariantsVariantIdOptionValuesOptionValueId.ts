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

export async function deleteEcommerceMallSellerSellersMeProductsProductIdVariantsVariantIdOptionValuesOptionValueId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  optionValueId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Verify product ownership
  const product = await MyGlobal.prisma.ecommerce_mall_products.findUnique({
    where: { id: props.productId },
    select: { id: true, ecommerce_mall_seller_id: true },
  });
  if (product === null) {
    throw new HttpException("Product not found", 404);
  }
  if (product.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 2: Verify variant belongs to product
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUnique({
      where: { id: props.variantId },
      select: { id: true, ecommerce_mall_product_id: true },
    });
  if (variant === null) {
    throw new HttpException("Variant not found", 404);
  }
  if (variant.ecommerce_mall_product_id !== props.productId) {
    throw new HttpException("Variant not found", 404);
  }
  // Step 3: Verify option value belongs to variant
  const optionValue =
    await MyGlobal.prisma.ecommerce_mall_product_variant_option_values.findUnique(
      {
        where: { id: props.optionValueId },
        select: { id: true, ecommerce_mall_product_variant_id: true },
      },
    );
  if (optionValue === null) {
    throw new HttpException("Option value not found", 404);
  }
  if (optionValue.ecommerce_mall_product_variant_id !== props.variantId) {
    throw new HttpException("Option value not found", 404);
  }
  // Step 4: Check deletion constraints
  // Check for paid or shipped order items for this variant
  const orderItemsWithStatus =
    await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
      where: {
        ecommerce_mall_product_variant_id: props.variantId,
        status: { in: ["paid", "shipped"] },
      },
      select: { id: true },
    });
  if (orderItemsWithStatus.length > 0) {
    throw new HttpException(
      "Cannot delete option value: variant has paid or shipped order items",
      409,
    );
  }
  // Get order item IDs for this variant
  const orderItemIds = orderItemsWithStatus.map((item) => item.id);
  // Check for pending cancellation requests
  const pendingCancellationRequests =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findMany({
      where: {
        ecommerce_mall_order_item_id: { in: orderItemIds },
        status: "pending",
      },
      select: { id: true },
    });
  if (pendingCancellationRequests.length > 0) {
    throw new HttpException(
      "Cannot delete option value: variant has pending cancellation requests",
      409,
    );
  }
  // Check for pending refund requests
  const pendingRefundRequests =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.findMany({
      where: {
        ecommerce_mall_order_item_id: { in: orderItemIds },
        status: "pending",
      },
      select: { id: true },
    });
  if (pendingRefundRequests.length > 0) {
    throw new HttpException(
      "Cannot delete option value: variant has pending refund requests",
      409,
    );
  }
  // Step 5: Delete option value (cascade handles any nested relations)
  await MyGlobal.prisma.ecommerce_mall_product_variant_option_values.delete({
    where: { id: props.optionValueId },
  });
  // Step 6: Update variant timestamp
  await MyGlobal.prisma.ecommerce_mall_product_variants.update({
    where: { id: props.variantId },
    data: { updated_at: new Date() },
  });
  // Step 7: Return void (204 No Content)
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
// export async function deleteEcommerceMallSellerSellersMeProductsProductIdVariantsVariantIdOptionValuesOptionValueId(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   variantId: string & tags.Format<"uuid">;
//   optionValueId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------