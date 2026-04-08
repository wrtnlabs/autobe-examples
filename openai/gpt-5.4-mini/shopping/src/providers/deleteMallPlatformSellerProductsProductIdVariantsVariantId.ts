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

export async function deleteMallPlatformSellerProductsProductIdVariantsVariantId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
}): Promise<void> {
  const product =
    await MyGlobal.prisma.mall_platform_products.findUniqueOrThrow({
      where: {
        id: props.productId,
      },
      select: {
        id: true,
        seller_account_id: true,
      },
    });
  if (product.seller_account_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const variant =
    await MyGlobal.prisma.mall_platform_product_variants.findFirst({
      where: {
        id: props.variantId,
        mall_platform_product_id: props.productId,
      },
      select: {
        id: true,
      },
    });
  if (variant === null) {
    throw new HttpException("Variant not found for the specified product", 404);
  }
  const blockingOrderItem =
    await MyGlobal.prisma.mall_platform_order_items.findFirst({
      where: {
        mall_platform_product_variant_id: props.variantId,
        status: {
          in: ["paid", "shipped"],
        },
      },
      select: {
        id: true,
      },
    });
  if (blockingOrderItem !== null) {
    throw new HttpException(
      "Conflict: the variant has pending order items",
      409,
    );
  }
  const blockingCancellationRequest =
    await MyGlobal.prisma.mall_platform_cancellation_requests.findFirst({
      where: {
        mall_platform_order_item_id: props.variantId,
        status: "pending",
      },
      select: {
        id: true,
      },
    });
  if (blockingCancellationRequest !== null) {
    throw new HttpException(
      "Conflict: the variant has pending cancellation requests",
      409,
    );
  }
  const blockingRefundRequest =
    await MyGlobal.prisma.mall_platform_refund_requests.findFirst({
      where: {
        mall_platform_order_item_id: props.variantId,
        status: "pending",
      },
      select: {
        id: true,
      },
    });
  if (blockingRefundRequest !== null) {
    throw new HttpException(
      "Conflict: the variant has pending refund requests",
      409,
    );
  }
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.mall_platform_inventory_records.deleteMany({
      where: {
        mall_platform_product_variant_id: props.variantId,
      },
    }),
    MyGlobal.prisma.mall_platform_product_variants.delete({
      where: {
        id: props.variantId,
      },
    }),
  ]);
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
// export async function deleteMallPlatformSellerProductsProductIdVariantsVariantId(props: {
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