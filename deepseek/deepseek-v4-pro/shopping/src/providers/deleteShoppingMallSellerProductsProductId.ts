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
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        shopping_mall_seller_id: true,
        deleted_at: true,
      },
    });
  if (product.deleted_at !== null) {
    throw new HttpException("Product not found", 404);
  }
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const pendingOrderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findFirst({
      where: {
        status: { in: ["paid", "shipped"] },
        productVariant: {
          shopping_mall_product_id: props.productId,
          deleted_at: null,
        },
      },
      select: { id: true },
    });
  if (pendingOrderItem !== null) {
    throw new HttpException(
      "Cannot delete product with pending order items in paid or shipped status",
      409,
    );
  }
  const pendingCancellation =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findFirst({
      where: {
        status: "pending",
        deleted_at: null,
        orderItem: {
          productVariant: {
            shopping_mall_product_id: props.productId,
            deleted_at: null,
          },
        },
      },
      select: { id: true },
    });
  if (pendingCancellation !== null) {
    throw new HttpException(
      "Cannot delete product with pending cancellation requests",
      409,
    );
  }
  const pendingRefund =
    await MyGlobal.prisma.shopping_mall_refund_requests.findFirst({
      where: {
        status: "pending",
        deleted_at: null,
        orderItem: {
          productVariant: {
            shopping_mall_product_id: props.productId,
            deleted_at: null,
          },
        },
      },
      select: { id: true },
    });
  if (pendingRefund !== null) {
    throw new HttpException(
      "Cannot delete product with pending refund requests",
      409,
    );
  }
  const now = new Date().toISOString();
  await MyGlobal.prisma.shopping_mall_products.update({
    where: { id: props.productId },
    data: { deleted_at: now },
  });
  await MyGlobal.prisma.shopping_mall_product_variants.updateMany({
    where: {
      shopping_mall_product_id: props.productId,
      deleted_at: null,
    },
    data: { deleted_at: now },
  });
  await MyGlobal.prisma.shopping_mall_inventory_records.deleteMany({
    where: {
      variant: {
        shopping_mall_product_id: props.productId,
      },
    },
  });
  await MyGlobal.prisma.shopping_mall_product_images.deleteMany({
    where: {
      shopping_mall_product_id: props.productId,
    },
  });
  await MyGlobal.prisma.shopping_mall_wishlist_items.deleteMany({
    where: {
      shopping_mall_product_id: props.productId,
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