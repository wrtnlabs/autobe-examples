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

export async function deleteMallPlatformSellerProductsProductId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
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
  const variantIds = (
    await MyGlobal.prisma.mall_platform_product_variants.findMany({
      where: {
        mall_platform_product_id: props.productId,
      },
      select: {
        id: true,
      },
    })
  ).map((variant) => variant.id);
  const blockingOrderItems =
    await MyGlobal.prisma.mall_platform_order_items.findMany({
      where: {
        mall_platform_product_variant_id: {
          in: variantIds,
        },
        status: {
          in: ["paid", "shipped"],
        },
      },
      select: {
        id: true,
      },
    });
  if (blockingOrderItems.length > 0) {
    throw new HttpException("Product has pending order items", 400);
  }
  const blockingOrderItemIds = blockingOrderItems.map((item) => item.id);
  const blockingCancellationRequests =
    await MyGlobal.prisma.mall_platform_cancellation_requests.findMany({
      where: {
        mall_platform_order_item_id: {
          in: blockingOrderItemIds,
        },
        status: "pending",
      },
      select: {
        id: true,
      },
    });
  if (blockingCancellationRequests.length > 0) {
    throw new HttpException("Product has pending cancellation requests", 400);
  }
  const blockingRefundRequests =
    await MyGlobal.prisma.mall_platform_refund_requests.findMany({
      where: {
        mall_platform_order_item_id: {
          in: blockingOrderItemIds,
        },
        status: "pending",
      },
      select: {
        id: true,
      },
    });
  if (blockingRefundRequests.length > 0) {
    throw new HttpException("Product has pending refund requests", 400);
  }
  await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.mall_platform_inventory_records.deleteMany({
      where: {
        mall_platform_product_variant_id: {
          in: variantIds,
        },
      },
    });
    await prisma.mall_platform_product_variants.deleteMany({
      where: {
        mall_platform_product_id: props.productId,
      },
    });
    await prisma.mall_platform_products.delete({
      where: {
        id: props.productId,
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
// export async function deleteMallPlatformSellerProductsProductId(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------