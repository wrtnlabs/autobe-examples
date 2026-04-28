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

export async function deleteEcommercePlatformSellerProductsProductIdVariantsSkuCode(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  skuCode: string;
}): Promise<void> {
  // Step 1 & 2: Find variant and verify ownership
  const variant =
    await MyGlobal.prisma.ecommerce_platform_product_variants.findFirstOrThrow({
      where: {
        ecommerce_platform_product_id: props.productId,
        sku_code: props.skuCode,
        deleted_at: null,
      },
      select: {
        id: true,
        product: {
          select: {
            sellerProfile: {
              select: {
                seller_id: true,
              },
            },
          },
        },
      },
    });
  if (variant.product.sellerProfile.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Check blocking conditions
  // Check for order items in paid or shipped status
  const blockingOrderItems =
    await MyGlobal.prisma.ecommerce_platform_order_items.findFirst({
      where: {
        ecommerce_platform_product_variant_id: variant.id,
        status: { in: ["paid", "shipped"] },
      },
    });
  if (blockingOrderItems !== null) {
    throw new HttpException(
      "Cannot delete variant with active order items",
      409,
    );
  }
  // Check for pending cancellation requests via order items
  const pendingCancellations =
    await MyGlobal.prisma.ecommerce_platform_cancellation_requests.findFirst({
      where: {
        status: "pending",
        orderItem: {
          productVariant: {
            id: variant.id,
          },
        },
      },
    });
  if (pendingCancellations !== null) {
    throw new HttpException(
      "Cannot delete variant with pending cancellation requests",
      409,
    );
  }
  // Check for pending refund requests via order items
  const pendingRefunds =
    await MyGlobal.prisma.ecommerce_platform_refund_requests.findFirst({
      where: {
        status: "pending",
        orderItem: {
          productVariant: {
            id: variant.id,
          },
        },
      },
    });
  if (pendingRefunds !== null) {
    throw new HttpException(
      "Cannot delete variant with pending refund requests",
      409,
    );
  }
  // Step 4: Perform soft delete in transaction
  await MyGlobal.prisma.$transaction([
    // Soft delete product variant options
    MyGlobal.prisma.ecommerce_platform_product_variant_options.updateMany({
      where: {
        ecommerce_platform_product_variant_id: variant.id,
      },
      data: {
        deleted_at: new Date(),
      },
    }),
    // Delete inventory records (hard delete as specified)
    MyGlobal.prisma.ecommerce_platform_inventory_records.deleteMany({
      where: {
        ecommerce_platform_product_variant_id: variant.id,
      },
    }),
    // Soft delete the variant
    MyGlobal.prisma.ecommerce_platform_product_variants.update({
      where: {
        id: variant.id,
      },
      data: {
        deleted_at: new Date(),
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
// export async function deleteEcommercePlatformSellerProductsProductIdVariantsSkuCode(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   skuCode: string;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------