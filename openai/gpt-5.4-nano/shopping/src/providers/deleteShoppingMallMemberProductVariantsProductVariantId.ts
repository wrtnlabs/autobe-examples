import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteShoppingMallMemberProductVariantsProductVariantId(props: {
  member: MemberPayload;
  productVariantId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.$transaction(async (tx) => {
    const variant = await tx.shopping_mall_product_variants.findUniqueOrThrow({
      where: { id: props.productVariantId },
      select: {
        id: true,
        shopping_mall_product_id: true,
        deleted_at: true,
        product: {
          select: {
            shopping_mall_seller_id: true,
          },
        },
      },
    });
    if (variant.product.shopping_mall_seller_id !== props.member.id) {
      throw new HttpException("Forbidden", 403);
    }
    const paidOrShippedOrderItem = await tx.shopping_mall_order_items.findFirst(
      {
        where: {
          shopping_mall_product_variant_id: props.productVariantId,
          deleted_at: null,
          line_item_status: { in: ["paid", "shipped"] },
        },
        select: { id: true },
      },
    );
    if (paidOrShippedOrderItem !== null) {
      throw new HttpException(
        "Variant deletion blocked by paid or shipped order items",
        400,
      );
    }
    const orderItems = await tx.shopping_mall_order_items.findMany({
      where: {
        shopping_mall_product_variant_id: props.productVariantId,
        deleted_at: null,
      },
      select: { id: true },
    });
    if (orderItems.length > 0) {
      const orderItemIds = orderItems.map((x) => x.id);
      const pendingCancellation =
        await tx.shopping_mall_cancellation_requests.findFirst({
          where: {
            shopping_mall_order_item_id: { in: orderItemIds },
            deleted_at: null,
            status: "pending",
          },
          select: { id: true },
        });
      if (pendingCancellation !== null) {
        throw new HttpException(
          "Variant deletion blocked by pending cancellation requests",
          400,
        );
      }
      const pendingRefund = await tx.shopping_mall_refund_requests.findFirst({
        where: {
          shopping_mall_order_item_id: { in: orderItemIds },
          deleted_at: null,
          status: "pending",
        },
        select: { id: true },
      });
      if (pendingRefund !== null) {
        throw new HttpException(
          "Variant deletion blocked by pending refund requests",
          400,
        );
      }
    }
    const deletedAt = toISOStringSafe(new Date());
    await tx.shopping_mall_product_variants.update({
      where: { id: props.productVariantId },
      data: {
        deleted_at: deletedAt,
        updated_at: deletedAt,
      },
    });
  });
}
