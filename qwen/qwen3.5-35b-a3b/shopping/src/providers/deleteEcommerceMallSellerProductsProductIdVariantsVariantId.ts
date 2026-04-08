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
  const currentDateTime: string & tags.Format<"date-time"> =
    new Date().toISOString();
  // Verify seller owns the parent product
  const product = await MyGlobal.prisma.ecommerce_mall_products.findFirst({
    where: {
      id: props.productId,
      seller_id: props.seller.id,
      deleted_at: null,
    },
  });
  if (product === null) {
    throw new HttpException("Product not found or access forbidden", 404);
  }
  // Verify variant exists and is not already deleted
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findFirst({
      where: {
        id: props.variantId,
        product_id: props.productId,
        deleted_at: null,
      },
    });
  if (variant === null) {
    throw new HttpException("Variant not found", 404);
  }
  // Check for blocking order items (paid or shipped status)
  const blockingOrderItems =
    await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
      where: {
        ecommerce_mall_product_variant_id: props.variantId,
        status: {
          in: ["paid", "shipped"],
        },
        deleted_at: null,
      },
    });
  if (blockingOrderItems.length > 0) {
    throw new HttpException(
      `Cannot delete variant: ${blockingOrderItems.length} order item(s) with paid or shipped status exist`,
      409,
    );
  }
  // Check for pending cancellation requests
  const pendingCancellations =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findMany({
      where: {
        status: "pending",
        deleted_at: null,
        item: {
          ecommerce_mall_product_variant_id: props.variantId,
        },
      },
    });
  if (pendingCancellations.length > 0) {
    throw new HttpException(
      `Cannot delete variant: ${pendingCancellations.length} cancellation request(s) pending`,
      409,
    );
  }
  // Check for pending refund requests
  const pendingRefunds =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.findMany({
      where: {
        status: "pending",
        deleted_at: null,
        item: {
          ecommerce_mall_product_variant_id: props.variantId,
        },
      },
    });
  if (pendingRefunds.length > 0) {
    throw new HttpException(
      `Cannot delete variant: ${pendingRefunds.length} refund request(s) pending`,
      409,
    );
  }
  // Soft-delete the variant
  await MyGlobal.prisma.ecommerce_mall_product_variants.update({
    where: {
      id: props.variantId,
    },
    data: {
      deleted_at: currentDateTime,
    },
  });
  // Soft-delete associated inventory records
  await MyGlobal.prisma.ecommerce_mall_inventory_records.updateMany({
    where: {
      ecommerce_mall_product_variant_id: props.variantId,
    },
    data: {
      deleted_at: currentDateTime,
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