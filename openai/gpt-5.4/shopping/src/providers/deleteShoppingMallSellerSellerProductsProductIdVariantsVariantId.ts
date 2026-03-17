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

export async function deleteShoppingMallSellerSellerProductsProductIdVariantsVariantId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
}): Promise<void> {
  const product = await MyGlobal.prisma.shopping_mall_products.findFirstOrThrow(
    {
      where: {
        id: props.productId,
        deleted_at: null,
      },
      select: {
        id: true,
        shopping_mall_seller_id: true,
      },
    },
  );
  if (product.shopping_mall_seller_id !== props.seller.id)
    throw new HttpException("Forbidden", 403);
  await MyGlobal.prisma.shopping_mall_product_variants.findFirstOrThrow({
    where: {
      id: props.variantId,
      shopping_mall_product_id: props.productId,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  const paidOrderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findFirst({
      where: {
        shopping_mall_product_variant_id: props.variantId,
        status: "paid",
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (paidOrderItem !== null)
    throw new HttpException(
      "Variant deletion is blocked by paid order items.",
      400,
    );
  const shippedOrderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findFirst({
      where: {
        shopping_mall_product_variant_id: props.variantId,
        status: "shipped",
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (shippedOrderItem !== null)
    throw new HttpException(
      "Variant deletion is blocked by shipped order items.",
      400,
    );
  const pendingCancellationRequest =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findFirst({
      where: {
        status: "pending",
        deleted_at: null,
        orderItem: {
          shopping_mall_product_variant_id: props.variantId,
          deleted_at: null,
        },
      },
      select: {
        id: true,
      },
    });
  if (pendingCancellationRequest !== null)
    throw new HttpException(
      "Variant deletion is blocked by pending cancellation requests.",
      400,
    );
  const pendingRefundRequest =
    await MyGlobal.prisma.shopping_mall_refund_requests.findFirst({
      where: {
        status: "pending",
        deleted_at: null,
        orderItem: {
          shopping_mall_product_variant_id: props.variantId,
          deleted_at: null,
        },
      },
      select: {
        id: true,
      },
    });
  if (pendingRefundRequest !== null)
    throw new HttpException(
      "Variant deletion is blocked by pending refund requests.",
      400,
    );
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_product_variants.update({
      where: {
        id: props.variantId,
      },
      data: {
        updated_at: new Date(),
        deleted_at: new Date(),
      },
    });
  });
}
