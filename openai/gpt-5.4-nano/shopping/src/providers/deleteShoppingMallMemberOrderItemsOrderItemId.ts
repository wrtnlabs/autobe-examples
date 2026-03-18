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

export async function deleteShoppingMallMemberOrderItemsOrderItemId(props: {
  member: MemberPayload;
  orderItemId: string & tags.Format<"uuid">;
}): Promise<void> {
  const deletedAt: string & tags.Format<"date-time"> =
    "2026-03-18T12:40:50.146Z";
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.orderItemId },
      select: {
        id: true,
        shopping_mall_order_id: true,
        shopping_mall_product_variant_id: true,
        line_item_status: true,
        shopping_mall_shipment_id: true,
        deleted_at: true,
        seller_snapshot_id: true,
        order: {
          select: {
            id: true,
            shopping_customer_id: true,
            deleted_at: true,
          },
        },
        cancellationRequests: {
          select: { id: true, status: true, deleted_at: true },
        },
        refundRequests: {
          select: { id: true, status: true, deleted_at: true },
        },
        shipment: {
          select: { id: true, status: true, deleted_at: true },
        },
      },
    });
  const isOwner = orderItem.order.shopping_customer_id === props.member.id;
  if (!isOwner) {
    throw new HttpException("Forbidden", 403);
  }
  if (orderItem.deleted_at !== null) {
    // Already removed; treat as conflict to avoid double-processing.
    throw new HttpException("Order item already deleted", 409);
  }
  const hasActiveCancellation = orderItem.cancellationRequests.some(
    (r) => r.deleted_at === null,
  );
  const hasActiveRefund = orderItem.refundRequests.some(
    (r) => r.deleted_at === null,
  );
  if (hasActiveCancellation || hasActiveRefund) {
    throw new HttpException(
      "Cannot erase order item with active cancellation/refund workflow",
      409,
    );
  }
  // If shipped/delivered via shipment confirmation, forbid deletion.
  if (orderItem.shopping_mall_shipment_id !== null) {
    const shipmentStatus = orderItem.shipment?.status ?? "";
    if (shipmentStatus !== "pending" && shipmentStatus !== "created") {
      throw new HttpException("Cannot erase fulfilled order item", 409);
    }
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_order_items.update({
      where: { id: orderItem.id },
      data: {
        deleted_at: deletedAt,
        updated_at: deletedAt as unknown as Date,
      },
      select: { id: true },
    });
  });
}
