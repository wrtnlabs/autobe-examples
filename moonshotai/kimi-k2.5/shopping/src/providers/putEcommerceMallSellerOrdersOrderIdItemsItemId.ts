import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallOrderItemTransformer } from "../transformers/EcommerceMallOrderItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallSellerOrdersOrderIdItemsItemId(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  body: IEcommerceMallOrderItem.IUpdate;
}): Promise<IEcommerceMallOrderItem> {
  // Find order item and verify ownership
  const orderItem = await MyGlobal.prisma.ecommerce_mall_order_items.findFirst({
    where: {
      id: props.itemId,
      order_id: props.orderId,
      deleted_at: null,
    },
    select: {
      id: true,
      seller_id: true,
      status: true,
      variant_id: true,
      quantity: true,
    },
  } satisfies Prisma.ecommerce_mall_order_itemsFindFirstArgs);
  if (orderItem === null) {
    throw new HttpException("Order item not found", 404);
  }
  // Verify seller ownership
  if (orderItem.seller_id !== props.seller.id) {
    throw new HttpException(
      "Forbidden - cannot update another seller's order item",
      403,
    );
  }
  // Validate status transition
  const currentStatus = orderItem.status;
  const newStatus = props.body.status;
  if (newStatus !== undefined && newStatus !== currentStatus) {
    const validTransitions: Record<string, string[]> = {
      paid: ["shipped", "cancelled"],
      shipped: ["delivered"],
      delivered: ["refunded"],
    };
    const allowedNextStatuses = validTransitions[currentStatus] ?? [];
    if (!allowedNextStatuses.includes(newStatus)) {
      throw new HttpException(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
        400,
      );
    }
  }
  // Update order item
  const updated = await MyGlobal.prisma.ecommerce_mall_order_items.update({
    where: { id: props.itemId },
    data: {
      ...(newStatus !== undefined && { status: newStatus }),
      updated_at: toISOStringSafe(new Date()),
    },
    ...EcommerceMallOrderItemTransformer.select(),
  });
  // Create inventory record to restore stock for cancelled/refunded
  if (
    newStatus !== undefined &&
    (newStatus === "cancelled" || newStatus === "refunded")
  ) {
    await MyGlobal.prisma.ecommerce_mall_inventory_records.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        variant: {
          connect: {
            id: orderItem.variant_id,
          },
        },
        quantity_change: orderItem.quantity,
        reason:
          newStatus === "cancelled" ? "order_cancelled" : "order_refunded",
        created_at: toISOStringSafe(new Date()),
      } satisfies Prisma.ecommerce_mall_inventory_recordsCreateInput,
    });
  }
  return EcommerceMallOrderItemTransformer.transform(updated);
}
