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

export async function patchEcommerceMallSellerOrdersOrderIdItemsOrderItemIdCancelApprove(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  orderItemId: string & tags.Format<"uuid">;
}): Promise<void> {
  const now = new Date().toISOString() as string & tags.Format<"date-time">;
  const orderItem =
    await MyGlobal.prisma.ecommerce_mall_order_items.findUniqueOrThrow({
      where: { id: props.orderItemId },
      select: {
        id: true,
        order_id: true,
        seller_id: true,
        item_status: true,
        variant_id: true,
        quantity: true,
      },
    });
  if (orderItem.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const cancellationRequest =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findFirstOrThrow(
      {
        where: {
          order_item_id: props.orderItemId,
          status: "pending",
          deleted_at: null,
        },
        select: { id: true, status: true },
      },
    );
  if (orderItem.item_status !== "paid") {
    throw new HttpException("Cannot cancel: item status is not paid", 409);
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.ecommerce_mall_cancellation_requests.update({
      where: { id: cancellationRequest.id },
      data: {
        status: "approved",
        responded_at: now,
        updated_at: now,
      },
    });
    await tx.ecommerce_mall_order_items.update({
      where: { id: props.orderItemId },
      data: {
        item_status: "cancelled",
        updated_at: now,
      },
    });
    await tx.ecommerce_mall_inventory_records.create({
      data: {
        id: v4(),
        variant_id: orderItem.variant_id,
        quantity_change: orderItem.quantity,
        reason: "cancel",
        reference_id: cancellationRequest.id,
        created_at: now,
      },
    });
  });
}
