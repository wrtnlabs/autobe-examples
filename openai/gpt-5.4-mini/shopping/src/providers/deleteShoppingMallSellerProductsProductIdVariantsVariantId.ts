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
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        shopping_mall_seller_id: true,
      },
    });
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.shopping_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      select: {
        id: true,
        shopping_mall_product_id: true,
      },
    });
    const ownedVariant =
      await prisma.shopping_mall_product_variants.findFirstOrThrow({
        where: {
          id: props.variantId,
          shopping_mall_product_id: props.productId,
        },
        select: {
          id: true,
        },
      });
    const activeOrderItem = await prisma.shopping_mall_order_items.findFirst({
      where: {
        shopping_mall_product_variant_id: ownedVariant.id,
        deleted_at: null,
        status: {
          in: ["paid", "shipped"],
        },
      },
      select: {
        id: true,
      },
    });
    if (activeOrderItem !== null) {
      throw new HttpException("Conflict", 409);
    }
    const activeCancellationRequest =
      await prisma.shopping_mall_cancellation_requests.findFirst({
        where: {
          orderItem: {
            shopping_mall_product_variant_id: ownedVariant.id,
            deleted_at: null,
            status: {
              in: ["paid", "shipped"],
            },
          },
          deleted_at: null,
          status: "pending",
        },
        select: {
          id: true,
        },
      });
    if (activeCancellationRequest !== null) {
      throw new HttpException("Conflict", 409);
    }
    const activeRefundRequest =
      await prisma.shopping_mall_refund_requests.findFirst({
        where: {
          orderItem: {
            shopping_mall_product_variant_id: ownedVariant.id,
            deleted_at: null,
          },
          deleted_at: null,
          status: "pending",
        },
        select: {
          id: true,
        },
      });
    if (activeRefundRequest !== null) {
      throw new HttpException("Conflict", 409);
    }
    await prisma.shopping_mall_product_variants.delete({
      where: {
        id: ownedVariant.id,
      },
    });
  });
}
