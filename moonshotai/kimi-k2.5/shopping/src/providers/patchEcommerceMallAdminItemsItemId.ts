import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallOrderItemTransformer } from "../transformers/EcommerceMallOrderItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminItemsItemId(props: {
  admin: AdminPayload;
  itemId: string & tags.Format<"uuid">;
  body: IEcommerceMallOrderItem.IUpdate;
}): Promise<IEcommerceMallOrderItem> {
  // Find the order item
  const orderItem =
    await MyGlobal.prisma.ecommerce_mall_order_items.findUniqueOrThrow({
      where: { id: props.itemId },
      select: {
        id: true,
        order_id: true,
        variant_id: true,
        quantity: true,
        status: true,
      },
    });
  // If status update requested, validate and process
  if (props.body.status !== undefined) {
    const currentStatus = orderItem.status;
    const newStatus = props.body.status;
    // Validate status transitions
    if (newStatus === "cancelled" && currentStatus !== "paid") {
      throw new HttpException(
        "Can only cancel order items with 'paid' status",
        400,
      );
    }
    if (newStatus === "refunded" && currentStatus !== "delivered") {
      throw new HttpException(
        "Can only refund order items with 'delivered' status",
        400,
      );
    }
    if (newStatus !== "cancelled" && newStatus !== "refunded") {
      throw new HttpException(
        "Admin can only change status to 'cancelled' or 'refunded'",
        400,
      );
    }
    // Perform status change with inventory restoration and snapshot
    await MyGlobal.prisma.$transaction(async (tx) => {
      // Update order item status
      await tx.ecommerce_mall_order_items.update({
        where: { id: props.itemId },
        data: {
          status: newStatus,
          updated_at: new Date(),
        },
      });
      // Restore inventory by creating positive inventory record
      await tx.ecommerce_mall_inventory_records.create({
        data: {
          id: v4(),
          variant: {
            connect: {
              id: orderItem.variant_id,
            },
          },
          quantity_change: orderItem.quantity,
          reason: `admin_${newStatus}`,
          created_at: new Date(),
        },
      });
      // Update order status based on all items
      const orderItems = await tx.ecommerce_mall_order_items.findMany({
        where: { order_id: orderItem.order_id },
        select: { status: true },
      });
      const statuses = orderItems.map((item) => item.status);
      const allCancelled = statuses.every((s) => s === "cancelled");
      const allRefunded = statuses.every((s) => s === "refunded");
      const anyDelivered = statuses.some((s) => s === "delivered");
      const anyShipped = statuses.some((s) => s === "shipped");
      const anyCancelledOrRefunded = statuses.some(
        (s) => s === "cancelled" || s === "refunded",
      );
      let newOrderStatus: string;
      if (allCancelled) {
        newOrderStatus = "cancelled";
      } else if (allRefunded) {
        newOrderStatus = "refunded";
      } else if (anyDelivered) {
        newOrderStatus = "delivered";
      } else if (anyShipped) {
        newOrderStatus = "shipped";
      } else if (anyCancelledOrRefunded) {
        newOrderStatus = "partially_completed";
      } else {
        newOrderStatus = "paid";
      }
      await tx.ecommerce_mall_orders.update({
        where: { id: orderItem.order_id },
        data: {
          status: newOrderStatus,
          updated_at: new Date(),
        },
      });
      // Create order snapshot for audit trail
      await tx.ecommerce_mall_order_snapshots.create({
        data: {
          id: v4(),
          order_id: orderItem.order_id,
          created_at: new Date(),
        },
      });
    });
  }
  // Return updated order item with full details
  const updated =
    await MyGlobal.prisma.ecommerce_mall_order_items.findUniqueOrThrow({
      where: { id: props.itemId },
      ...EcommerceMallOrderItemTransformer.select(),
    });
  return await EcommerceMallOrderItemTransformer.transform(updated);
}
