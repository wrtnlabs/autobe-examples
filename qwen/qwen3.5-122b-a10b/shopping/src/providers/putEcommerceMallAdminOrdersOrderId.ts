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

export async function putEcommerceMallAdminOrdersOrderId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  body: IEcommerceMallOrder.IUpdate;
}): Promise<IEcommerceMallOrder> {
  // 1. Authorization is handled by AdminAuth decorator
  // 2. Order retrieval with soft-delete check
  const order = await MyGlobal.prisma.ecommerce_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId, deleted_at: null },
    select: {
      id: true,
      status: true,
      orderItems: {
        select: {
          id: true,
          quantity: true,
          status: true,
          ecommerce_mall_product_variant_id: true,
        },
      },
    },
  });
  // 3. Validate status update
  if (!props.body.status) {
    throw new HttpException("Status field is required", 400);
  }
  const newStatus = props.body.status;
  const currentStatus = order.status;
  // Check if already in target status
  if (currentStatus === newStatus) {
    throw new HttpException("Order already in target status", 400);
  }
  // 4. Force-action processing for cancelled/refunded
  const isForceAction = newStatus === "cancelled" || newStatus === "refunded";
  const now = new Date();
  const nowString = toISOStringSafe(now);
  if (isForceAction) {
    await MyGlobal.prisma.$transaction(async (tx) => {
      // Process each order item
      for (const item of order.orderItems) {
        // Fetch current stock for inventory record
        const variant =
          await tx.ecommerce_mall_product_variants.findUniqueOrThrow({
            where: { id: item.ecommerce_mall_product_variant_id },
            select: { stock_quantity: true },
          });
        // Update order item status
        await tx.ecommerce_mall_order_items.update({
          where: { id: item.id },
          data: {
            status: newStatus,
            updated_at: now,
          },
        });
        // Create inventory record for stock restoration
        await tx.ecommerce_mall_inventory_records.create({
          data: {
            id: v4(),
            ecommerce_mall_product_variant_id:
              item.ecommerce_mall_product_variant_id,
            quantity_change: item.quantity,
            reason:
              newStatus === "cancelled"
                ? "admin_force_cancel"
                : "admin_force_refund",
            current_stock: variant.stock_quantity + item.quantity,
            recorded_at: now,
            created_at: now,
            updated_at: now,
          },
        });
        // Create order item snapshot for audit trail
        await tx.ecommerce_mall_order_item_snapshots.create({
          data: {
            id: v4(),
            snapshot_type: "orderItem",
            previous_values: JSON.stringify({
              status: item.status,
              quantity: item.quantity,
            }),
            current_values: JSON.stringify({
              status: newStatus,
              quantity: item.quantity,
            }),
            changedBy: {
              connect: {
                id: props.admin.id,
              },
            },
            orderItem: {
              connect: {
                id: item.id,
              },
            },
            created_at: now,
          },
        });
      }
      // Update order status
      await tx.ecommerce_mall_orders.update({
        where: { id: props.orderId },
        data: {
          status: newStatus,
          updated_at: now,
        },
      });
    });
  } else {
    // 5. Regular status update (non-force-action)
    await MyGlobal.prisma.ecommerce_mall_orders.update({
      where: { id: props.orderId },
      data: {
        status: newStatus,
        updated_at: now,
      },
    });
  }
  // 6. Fetch and transform updated order
  const updated = await MyGlobal.prisma.ecommerce_mall_orders.findUniqueOrThrow(
    {
      where: { id: props.orderId },
      ...EcommerceMallOrderTransformer.select(),
    },
  );
  return await EcommerceMallOrderTransformer.transform(updated);
}
