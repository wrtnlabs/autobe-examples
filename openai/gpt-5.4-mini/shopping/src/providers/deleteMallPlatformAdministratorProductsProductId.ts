import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteMallPlatformAdministratorProductsProductId(props: {
  administrator: AdministratorPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.mall_platform_administrators.findUniqueOrThrow({
    where: {
      id: props.administrator.id,
    },
    select: {
      id: true,
    },
  });
  const product =
    await MyGlobal.prisma.mall_platform_products.findUniqueOrThrow({
      where: {
        id: props.productId,
      },
      select: {
        id: true,
      },
    });
  const variantIds = (
    await MyGlobal.prisma.mall_platform_product_variants.findMany({
      where: {
        mall_platform_product_id: product.id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    })
  ).map((variant) => variant.id);
  if (variantIds.length > 0) {
    const blockingOrderItem =
      await MyGlobal.prisma.mall_platform_order_items.findFirst({
        where: {
          mall_platform_product_variant_id: { in: variantIds },
          status: { in: ["paid", "shipped"] },
          deleted_at: null,
        },
        select: {
          id: true,
        },
      });
    if (blockingOrderItem !== null) {
      throw new HttpException(
        "Product cannot be deleted because it has paid or shipped order items.",
        400,
      );
    }
    const blockingCancellationOrderItem =
      await MyGlobal.prisma.mall_platform_order_items.findFirst({
        where: {
          mall_platform_product_variant_id: { in: variantIds },
          cancellationRequests: {
            some: {
              status: "pending",
              deleted_at: null,
            },
          },
          deleted_at: null,
        },
        select: {
          id: true,
        },
      });
    if (blockingCancellationOrderItem !== null) {
      throw new HttpException(
        "Product cannot be deleted because it has pending cancellation requests.",
        400,
      );
    }
    const blockingRefundOrderItem =
      await MyGlobal.prisma.mall_platform_order_items.findFirst({
        where: {
          mall_platform_product_variant_id: { in: variantIds },
          refundRequests: {
            some: {
              status: "pending",
              deleted_at: null,
            },
          },
          deleted_at: null,
        },
        select: {
          id: true,
        },
      });
    if (blockingRefundOrderItem !== null) {
      throw new HttpException(
        "Product cannot be deleted because it has pending refund requests.",
        400,
      );
    }
  }
  await MyGlobal.prisma.$transaction(async (prisma) => {
    if (variantIds.length > 0) {
      await prisma.mall_platform_inventory_records.deleteMany({
        where: {
          mall_platform_product_variant_id: { in: variantIds },
        },
      });
      await prisma.mall_platform_product_variants.deleteMany({
        where: {
          mall_platform_product_id: product.id,
        },
      });
    }
    await prisma.mall_platform_products.delete({
      where: {
        id: product.id,
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
// export async function deleteMallPlatformAdministratorProductsProductId(props: {
//   administrator: AdministratorPayload;
//   productId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------