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

export async function deleteEcommercePlatformSellerProductsProductId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<void> {
  const product =
    await MyGlobal.prisma.ecommerce_platform_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        sellerProfile: {
          select: {
            seller_id: true,
          },
        },
      },
    });
  if (product.sellerProfile.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const variants =
    await MyGlobal.prisma.ecommerce_platform_product_variants.findMany({
      where: {
        ecommerce_platform_product_id: props.productId,
      },
      select: {
        id: true,
      },
    });
  const variantIds = variants.map((v) => v.id);
  const activeOrder =
    await MyGlobal.prisma.ecommerce_platform_order_items.findFirst({
      where: {
        ecommerce_platform_product_variant_id: { in: variantIds },
        status: { in: ["paid", "shipped"] },
      },
      select: {
        id: true,
      },
    });
  if (activeOrder !== null) {
    throw new HttpException("Cannot delete product with active orders", 409);
  }
  const pendingCancellation =
    await MyGlobal.prisma.ecommerce_platform_cancellation_requests.findFirst({
      where: {
        status: "pending",
        orderItem: {
          productVariant: {
            id: {
              in: variantIds,
            },
          },
        },
      },
      select: {
        id: true,
      },
    });
  if (pendingCancellation !== null) {
    throw new HttpException(
      "Cannot delete product with pending cancellation requests",
      409,
    );
  }
  const pendingRefund =
    await MyGlobal.prisma.ecommerce_platform_refund_requests.findFirst({
      where: {
        status: "pending",
        orderItem: {
          productVariant: {
            id: {
              in: variantIds,
            },
          },
        },
      },
      select: {
        id: true,
      },
    });
  if (pendingRefund !== null) {
    throw new HttpException(
      "Cannot delete product with pending refund requests",
      409,
    );
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.ecommerce_platform_products.update({
      where: { id: props.productId },
      data: {
        deleted_at: new Date(),
      },
    });
    await tx.ecommerce_platform_product_variants.updateMany({
      where: {
        ecommerce_platform_product_id: props.productId,
      },
      data: {
        deleted_at: new Date(),
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
// export async function deleteEcommercePlatformSellerProductsProductId(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------