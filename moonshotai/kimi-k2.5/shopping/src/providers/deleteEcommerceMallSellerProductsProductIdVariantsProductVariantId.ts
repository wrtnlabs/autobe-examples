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

export async function deleteEcommerceMallSellerProductsProductIdVariantsProductVariantId(props: {
  seller: SellerPayload;
  productId: string;
  productVariantId: string;
}): Promise<void> {
  await MyGlobal.prisma.$transaction(async (prisma) => {
    // Verify product exists and is owned by the seller
    const product = await prisma.ecommerce_mall_products.findFirst({
      where: {
        id: props.productId,
        ecommerce_mall_seller_id: props.seller.id,
        deleted_at: null,
      },
      select: { id: true },
    });
    if (product === null) {
      throw new HttpException("Product not found", 404);
    }
    // Verify variant exists under this product and is not soft-deleted
    const variant = await prisma.ecommerce_mall_product_variants.findFirst({
      where: {
        id: props.productVariantId,
        ecommerce_mall_product_id: props.productId,
        deleted_at: null,
      },
      select: { id: true },
    });
    if (variant === null) {
      throw new HttpException("Variant not found", 404);
    }
    // Check for pending order items with status 'paid' or 'shipped'
    const pendingOrderItems = await prisma.ecommerce_mall_order_items.count({
      where: {
        ecommerce_mall_product_variant_id: props.productVariantId,
        status: {
          in: ["paid", "shipped"],
        },
      },
    });
    if (pendingOrderItems > 0) {
      throw new HttpException("VARIANT_HAS_PENDING_ORDERS", 409);
    }
    // Check for pending cancellation requests via order_items
    const pendingCancellations =
      await prisma.ecommerce_mall_cancellation_requests.count({
        where: {
          status: "pending",
          order_item: {
            ecommerce_mall_product_variant_id: props.productVariantId,
          },
        },
      });
    if (pendingCancellations > 0) {
      throw new HttpException("VARIANT_HAS_PENDING_CANCELLATIONS", 409);
    }
    // Check for pending refund requests via order_items
    const pendingRefunds = await prisma.ecommerce_mall_refund_requests.count({
      where: {
        status: "pending",
        order_item: {
          ecommerce_mall_product_variant_id: props.productVariantId,
        },
      },
    });
    if (pendingRefunds > 0) {
      throw new HttpException("VARIANT_HAS_PENDING_REFUNDS", 409);
    }
    // Perform soft delete
    await prisma.ecommerce_mall_product_variants.update({
      where: { id: props.productVariantId },
      data: {
        deleted_at: new Date(),
      },
    });
    // Check if any other active variants exist for this product
    const remainingVariants =
      await prisma.ecommerce_mall_product_variants.count({
        where: {
          ecommerce_mall_product_id: props.productId,
          deleted_at: null,
        },
      });
    // If no variants remain, mark product as unavailable
    if (remainingVariants === 0) {
      await prisma.ecommerce_mall_products.update({
        where: { id: props.productId },
        data: {
          is_available: false,
          updated_at: new Date(),
        },
      });
    }
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
// export async function deleteEcommerceMallSellerProductsProductIdVariantsProductVariantId(props: {
//   seller: SellerPayload;
//   productId: string;
//   productVariantId: string;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------