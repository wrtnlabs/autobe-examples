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

export async function deleteShoppingMallSellerProductsProductId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Find the product and verify ownership
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        shopping_mall_seller_id: true,
        deleted_at: true,
      },
    });
  // Verify product is not already deleted
  if (product.deleted_at !== null) {
    throw new HttpException("Product not found", 404);
  }
  // Verify seller owns this product
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 2: Check for pending order items (paid or shipped status)
  const pendingOrderItems =
    await MyGlobal.prisma.shopping_mall_order_items.count({
      where: {
        deleted_at: null,
        status: {
          in: ["paid", "shipped"],
        },
        productVariant: {
          shopping_mall_product_id: props.productId,
          deleted_at: null,
        },
      },
    });
  if (pendingOrderItems > 0) {
    throw new HttpException("Cannot delete product with pending orders", 409);
  }
  // Step 3: Check for pending cancellation requests
  const pendingCancellations =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.count({
      where: {
        deleted_at: null,
        status: "pending",
        orderItem: {
          productVariant: {
            shopping_mall_product_id: props.productId,
            deleted_at: null,
          },
        },
      },
    });
  if (pendingCancellations > 0) {
    throw new HttpException(
      "Cannot delete product with pending cancellation requests",
      409,
    );
  }
  // Step 4: Check for pending refund requests
  const pendingRefunds =
    await MyGlobal.prisma.shopping_mall_refund_requests.count({
      where: {
        deleted_at: null,
        status: "pending",
        orderItem: {
          productVariant: {
            shopping_mall_product_id: props.productId,
            deleted_at: null,
          },
        },
      },
    });
  if (pendingRefunds > 0) {
    throw new HttpException(
      "Cannot delete product with pending refund requests",
      409,
    );
  }
  // Step 5: Perform soft delete with ISO string timestamp
  await MyGlobal.prisma.shopping_mall_products.update({
    where: { id: props.productId },
    data: {
      deleted_at: new Date().toISOString(),
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
// export async function deleteShoppingMallSellerProductsProductId(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------