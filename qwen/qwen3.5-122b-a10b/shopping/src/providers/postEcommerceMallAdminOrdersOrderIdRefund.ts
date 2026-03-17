import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallOrderTransformer } from "../transformers/EcommerceMallOrderTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAdminOrdersOrderIdRefund(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  body: IEcommerceMallOrder.IRefund;
}): Promise<IEcommerceMallOrder> {
  // Validate reason length
  if (props.body.reason.length < 10) {
    throw new HttpException("Reason must be at least 10 characters", 400);
  }
  // Retrieve order with all order items
  const order = await MyGlobal.prisma.ecommerce_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    include: {
      orderItems: true,
    },
  });
  // Validate all order items are eligible for refund
  const ineligibleItems = order.orderItems.filter(
    (item) => item.status === "cancelled" || item.status === "refunded",
  );
  if (ineligibleItems.length > 0) {
    throw new HttpException(
      "Some order items are already cancelled or refunded",
      400,
    );
  }
  if (order.orderItems.length === 0) {
    throw new HttpException("Order has no items to refund", 400);
  }
  // Process refund in transaction for atomicity
  await MyGlobal.prisma.$transaction(async (tx) => {
    const now = new Date();
    for (const item of order.orderItems) {
      // Calculate days since delivery (0 if not delivered)
      const daysSinceDelivery = item.status === "delivered" ? 0 : 0;
      // Create refund request
      await tx.ecommerce_mall_order_item_refund_requests.create({
        data: {
          id: typia.random<string & tags.Format<"uuid">>(),
          ecommerce_mall_order_item_id: item.id,
          reason: props.body.reason,
          status: "approved",
          requested_at: now,
          responded_at: now,
          days_since_delivery: daysSinceDelivery,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      });
      // Get variant and create inventory record
      const variant =
        await tx.ecommerce_mall_product_variants.findUniqueOrThrow({
          where: { id: item.ecommerce_mall_product_variant_id },
        });
      const newStock = variant.stock_quantity + item.quantity;
      await tx.ecommerce_mall_inventory_records.create({
        data: {
          id: typia.random<string & tags.Format<"uuid">>(),
          ecommerce_mall_product_variant_id: variant.id,
          quantity_change: item.quantity,
          reason: "refund_approved",
          recorded_at: now,
          current_stock: newStock,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      });
      // Update product variant stock
      await tx.ecommerce_mall_product_variants.update({
        where: { id: variant.id },
        data: { stock_quantity: newStock },
      });
      // Create snapshot
      await tx.ecommerce_mall_order_item_snapshots.create({
        data: {
          id: typia.random<string & tags.Format<"uuid">>(),
          order_item_id: item.id,
          changed_by_id: props.admin.id,
          snapshot_type: "refund",
          created_at: now,
          previous_values: JSON.stringify({
            id: item.id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            status: item.status,
          }),
          current_values: JSON.stringify({
            id: item.id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            status: "refunded",
          }),
        },
      });
      // Update order item status
      await tx.ecommerce_mall_order_items.update({
        where: { id: item.id },
        data: {
          status: "refunded",
          updated_at: now,
        },
      });
    }
    // Update order status to refunded
    await tx.ecommerce_mall_orders.update({
      where: { id: props.orderId },
      data: {
        status: "refunded",
        updated_at: now,
      },
    });
  });
  // Return transformed order
  const updatedOrder =
    await MyGlobal.prisma.ecommerce_mall_orders.findUniqueOrThrow({
      where: { id: props.orderId },
      ...EcommerceMallOrderTransformer.select(),
    });
  return await EcommerceMallOrderTransformer.transform(updatedOrder);
}
