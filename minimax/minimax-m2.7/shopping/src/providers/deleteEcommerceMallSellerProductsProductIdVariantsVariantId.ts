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

export async function deleteEcommerceMallSellerProductsProductIdVariantsVariantId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.$transaction(async (tx) => {
    // 1. Ownership verification: Check product exists and belongs to seller
    const product = await tx.ecommerce_mall_products.findUnique({
      where: { id: props.productId },
      select: {
        id: true,
        ecommerce_mall_seller_id: true,
        deleted_at: true,
      },
    });
    if (product === null) {
      throw new HttpException("Product not found", 404);
    }
    if (product.deleted_at !== null) {
      throw new HttpException("Product not found", 404);
    }
    if (product.ecommerce_mall_seller_id !== props.seller.id) {
      throw new HttpException("Forbidden", 403);
    }
    // 2. Variant existence check
    const variant = await tx.ecommerce_mall_product_variants.findUnique({
      where: { id: props.variantId },
      select: {
        id: true,
        ecommerce_mall_product_id: true,
        deleted_at: true,
      },
    });
    if (variant === null) {
      throw new HttpException("Variant not found", 404);
    }
    if (variant.ecommerce_mall_product_id !== props.productId) {
      throw new HttpException("Variant not found", 404);
    }
    if (variant.deleted_at !== null) {
      throw new HttpException("Variant not found", 404);
    }
    // 3. Deletion eligibility checks
    // Check for paid or shipped order items
    const activeOrderItems = await tx.ecommerce_mall_order_items.findFirst({
      where: {
        ecommerce_mall_product_variant_id: props.variantId,
        status: {
          in: ["paid", "shipped"],
        },
      },
      select: {
        id: true,
      },
    });
    if (activeOrderItems !== null) {
      throw new HttpException(
        "Cannot delete variant: there are pending order items for this variant",
        400,
      );
    }
    // Check for pending cancellation requests via order_items join
    const pendingCancellation =
      await tx.ecommerce_mall_cancellation_requests.findFirst({
        where: {
          status: "pending",
          orderItem: {
            ecommerce_mall_product_variant_id: props.variantId,
          },
        },
        select: {
          id: true,
        },
      });
    if (pendingCancellation !== null) {
      throw new HttpException(
        "Cannot delete variant: there are pending cancellation requests for this variant",
        400,
      );
    }
    // Check for pending refund requests via order_items join
    const pendingRefund = await tx.ecommerce_mall_refund_requests.findFirst({
      where: {
        status: "pending",
        orderItem: {
          ecommerce_mall_product_variant_id: props.variantId,
        },
      },
      select: {
        id: true,
      },
    });
    if (pendingRefund !== null) {
      throw new HttpException(
        "Cannot delete variant: there are pending refund requests for this variant",
        400,
      );
    }
    // 4. Soft delete the variant
    await tx.ecommerce_mall_product_variants.update({
      where: { id: props.variantId },
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
// export async function deleteEcommerceMallSellerProductsProductIdVariantsVariantId(props: {
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