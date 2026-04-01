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
  await MyGlobal.prisma.$transaction(async (prisma) => {
    const product = await prisma.mall_platform_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        seller_account_id: true,
      },
    });
    if (product.seller_account_id !== props.seller.id) {
      throw new HttpException("Forbidden", 403);
    }
    const variant =
      await prisma.mall_platform_product_variants.findUniqueOrThrow({
        where: { id: props.variantId },
        select: {
          id: true,
          mall_platform_product_id: true,
        },
      });
    if (variant.mall_platform_product_id !== props.productId) {
      throw new HttpException("Not Found", 404);
    }
    const blockingOrderItem = await prisma.mall_platform_order_items.findFirst({
      where: {
        mall_platform_product_variant_id: props.variantId,
        deleted_at: null,
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
        "Cannot delete variant with pending order items",
        400,
      );
    }
    const blockingCancellationRequest =
      await prisma.mall_platform_cancellation_requests.findFirst({
        where: {
          orderItem: {
            mall_platform_product_variant_id: props.variantId,
          },
          deleted_at: null,
          status: "pending",
        },
        select: {
          id: true,
        },
      });
    if (blockingCancellationRequest !== null) {
      throw new HttpException(
        "Cannot delete variant with pending cancellation requests",
        400,
      );
    }
    const blockingRefundRequest =
      await prisma.mall_platform_refund_requests.findFirst({
        where: {
          orderItem: {
            mall_platform_product_variant_id: props.variantId,
          },
          deleted_at: null,
          status: "pending",
        },
        select: {
          id: true,
        },
      });
    if (blockingRefundRequest !== null) {
      throw new HttpException(
        "Cannot delete variant with pending refund requests",
        400,
      );
    }
    await prisma.mall_platform_product_variants.delete({
      where: { id: props.variantId },
    });
  });
}
