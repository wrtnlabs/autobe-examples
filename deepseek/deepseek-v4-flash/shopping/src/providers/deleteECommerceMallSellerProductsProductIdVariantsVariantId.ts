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

export async function deleteECommerceMallSellerProductsProductIdVariantsVariantId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Verify the authenticated seller owns the product
  const product =
    await MyGlobal.prisma.e_commerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { id: true, seller_id: true },
    });
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Verify the variant exists, belongs to the product, and is not already deleted
  const variant =
    await MyGlobal.prisma.e_commerce_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      select: {
        id: true,
        e_commerce_mall_product_id: true,
        deleted_at: true,
      },
    });
  if (variant.e_commerce_mall_product_id !== props.productId) {
    throw new HttpException("Variant not found", 404);
  }
  if (variant.deleted_at !== null) {
    throw new HttpException("Variant already deleted", 404);
  }
  // 3a. Check for paid or shipped order items referencing this variant
  const paidOrShippedOrderItem =
    await MyGlobal.prisma.e_commerce_mall_order_items.findFirst({
      where: {
        e_commerce_mall_product_variant_id: props.variantId,
        status: { in: ["paid", "shipped"] },
      },
      select: { id: true },
    });
  if (paidOrShippedOrderItem !== null) {
    throw new HttpException(
      "Cannot delete variant: order items in paid or shipped status reference this variant",
      400,
    );
  }
  // 3b. Check for pending cancellation requests associated with this variant
  const pendingCancellation =
    await MyGlobal.prisma.e_commerce_mall_cancellation_requests.findFirst({
      where: {
        orderItem: { e_commerce_mall_product_variant_id: props.variantId },
        status: "pending",
      },
      select: { id: true },
    });
  if (pendingCancellation !== null) {
    throw new HttpException(
      "Cannot delete variant: a pending cancellation request is associated with this variant",
      400,
    );
  }
  // 3c. Check for pending refund requests associated with this variant
  const pendingRefund =
    await MyGlobal.prisma.e_commerce_mall_refund_requests.findFirst({
      where: {
        orderItem: { e_commerce_mall_product_variant_id: props.variantId },
        status: "pending",
      },
      select: { id: true },
    });
  if (pendingRefund !== null) {
    throw new HttpException(
      "Cannot delete variant: a pending refund request is associated with this variant",
      400,
    );
  }
  // 4. Soft-delete the variant (Prisma accepts Date for DateTime fields)
  const now = new Date();
  await MyGlobal.prisma.e_commerce_mall_product_variants.update({
    where: { id: props.variantId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
  // 5. Delete all inventory records for this variant (cascade doesn't fire on soft-delete)
  await MyGlobal.prisma.e_commerce_mall_inventory_records.deleteMany({
    where: { e_commerce_mall_product_variant_id: props.variantId },
  });
  // 6. Check if the product has any remaining active variants
  const activeVariantsCount =
    await MyGlobal.prisma.e_commerce_mall_product_variants.count({
      where: {
        e_commerce_mall_product_id: props.productId,
        deleted_at: null,
      },
    });
  if (activeVariantsCount === 0) {
    await MyGlobal.prisma.e_commerce_mall_products.update({
      where: { id: props.productId },
      data: {
        visibility: "unavailable_but_visible",
        updated_at: now,
      },
    });
  }
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
// export async function deleteECommerceMallSellerProductsProductIdVariantsVariantId(props: {
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