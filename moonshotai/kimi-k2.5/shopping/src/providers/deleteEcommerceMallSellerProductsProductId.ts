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
  productId: string;
}): Promise<void> {
  // Step 1: Verify product exists and seller owns it
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { id: true, seller_id: true, deleted_at: true },
    });
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (product.deleted_at !== null) {
    throw new HttpException("Product already deleted", 409);
  }
  // Step 2: Check for pending order items with 'paid' or 'shipped' status
  const pendingOrderItems =
    await MyGlobal.prisma.ecommerce_mall_order_items.findFirst({
      where: {
        product_id: props.productId,
        status: { in: ["paid", "shipped"] },
        deleted_at: null,
      },
    });
  if (pendingOrderItems !== null) {
    throw new HttpException("Cannot delete product with pending orders", 409);
  }
  // Step 3: Check for pending cancellation requests
  const pendingCancellation =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findFirst({
      where: {
        orderItem: { product_id: props.productId },
        status: "pending",
      },
    });
  if (pendingCancellation !== null) {
    throw new HttpException(
      "Cannot delete product with pending cancellation requests",
      409,
    );
  }
  // Step 4: Check for pending refund requests
  const pendingRefund =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.findFirst({
      where: {
        orderItem: { product_id: props.productId },
        status: "pending",
      },
    });
  if (pendingRefund !== null) {
    throw new HttpException(
      "Cannot delete product with pending refund requests",
      409,
    );
  }
  // Step 5: Soft delete the product (cascade handles variants, images, inventory via schema onDelete)
  await MyGlobal.prisma.ecommerce_mall_products.update({
    where: { id: props.productId },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
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
// export async function deleteEcommerceMallSellerProductsProductId(props: {
//   seller: SellerPayload;
//   productId: string;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------