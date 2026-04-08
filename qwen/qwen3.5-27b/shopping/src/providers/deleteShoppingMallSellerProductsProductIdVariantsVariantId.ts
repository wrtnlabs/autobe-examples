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
  // 1. Verify product exists and belongs to seller
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: {
        id: props.productId,
        deleted_at: null,
      },
      select: {
        id: true,
        shopping_mall_seller_id: true,
      },
    });
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Product not found", 404);
  }
  // 2. Verify variant exists and belongs to product
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
      where: {
        id: props.variantId,
        shopping_mall_product_id: props.productId,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  // 3. Check for pending order items (paid or shipped status)
  const pendingOrderItems =
    await MyGlobal.prisma.shopping_mall_order_items.count({
      where: {
        shopping_mall_product_variant_id: props.variantId,
        deleted_at: null,
        status: {
          in: ["paid", "shipped"],
        },
      },
    });
  if (pendingOrderItems > 0) {
    throw new HttpException(
      "Cannot delete variant with pending order items",
      409,
    );
  }
  // 4. Check for pending cancellation requests
  const pendingCancellations =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.count({
      where: {
        orderItem: {
          shopping_mall_product_variant_id: props.variantId,
          deleted_at: null,
        },
        deleted_at: null,
        status: "pending",
      },
    });
  if (pendingCancellations > 0) {
    throw new HttpException(
      "Cannot delete variant with pending cancellation requests",
      409,
    );
  }
  // 5. Check for pending refund requests
  const pendingRefunds =
    await MyGlobal.prisma.shopping_mall_refund_requests.count({
      where: {
        orderItem: {
          shopping_mall_product_variant_id: props.variantId,
          deleted_at: null,
        },
        deleted_at: null,
        status: "pending",
      },
    });
  if (pendingRefunds > 0) {
    throw new HttpException(
      "Cannot delete variant with pending refund requests",
      409,
    );
  }
  // 6. Soft delete the variant
  await MyGlobal.prisma.shopping_mall_product_variants.update({
    where: {
      id: props.variantId,
    },
    data: {
      deleted_at: new Date(),
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