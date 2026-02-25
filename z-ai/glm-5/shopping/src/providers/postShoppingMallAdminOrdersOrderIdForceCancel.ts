import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallOrderItemVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantOption";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallOrderTransformer } from "../transformers/ShoppingMallOrderTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdminOrdersOrderIdForceCancel(props: {
  admin: AdminPayload;
  orderId: string;
  body: IShoppingMallOrder.IForceCancel;
}): Promise<IShoppingMallOrder> {
  // Validate order exists and check status
  const order = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    select: {
      id: true,
      order_number: true,
      status: true,
      orderItems: {
        select: {
          id: true,
          status: true,
          quantity: true,
          shopping_mall_product_variant_id: true,
          unit_price: true,
        },
      },
    },
  });
  // Check if order is already cancelled or refunded
  if (order.status === "cancelled" || order.status === "refunded") {
    throw new HttpException("Order is already cancelled or refunded", 400);
  }
  // Filter items that can be cancelled (not already cancelled or refunded)
  const itemsToCancel = order.orderItems.filter(
    (item) => item.status !== "cancelled" && item.status !== "refunded",
  );
  if (itemsToCancel.length === 0) {
    throw new HttpException("No items available for cancellation", 400);
  }
  // Calculate total refund amount
  const totalRefundAmount = itemsToCancel.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0,
  );
  const now = new Date();
  // Update all order items to cancelled
  await MyGlobal.prisma.shopping_mall_order_items.updateMany({
    where: {
      shopping_mall_order_id: props.orderId,
      status: { notIn: ["cancelled", "refunded"] },
    },
    data: {
      status: "cancelled",
    },
  });
  // Create inventory records for stock restoration
  for (const item of itemsToCancel) {
    if (item.shopping_mall_product_variant_id) {
      await MyGlobal.prisma.shopping_mall_product_inventory_histories.create({
        data: {
          id: v4(),
          shopping_mall_product_variant_id:
            item.shopping_mall_product_variant_id,
          quantity_change: item.quantity,
          reason: `Admin force-cancel - Order #${order.order_number}`,
          created_at: now,
        },
      });
    }
  }
  // Update order status
  await MyGlobal.prisma.shopping_mall_orders.update({
    where: { id: props.orderId },
    data: {
      status: "cancelled",
      updated_at: now,
    },
  });
  // Create admin audit log
  await MyGlobal.prisma.shopping_mall_admin_audit_logs.create({
    data: {
      id: v4(),
      shopping_mall_admin_id: props.admin.id,
      action: "order_force_cancel",
      target_type: "order",
      target_id: props.orderId,
      details: JSON.stringify({
        reason: props.body.reason,
        order_number: order.order_number,
        cancelled_item_count: itemsToCancel.length,
        total_refund_amount: totalRefundAmount,
      }),
      ip: "0.0.0.0",
      created_at: now,
    },
  });
  // Fetch and return the updated order using transformer
  const updatedOrder =
    await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
      where: { id: props.orderId },
      ...ShoppingMallOrderTransformer.select(),
    });
  return await ShoppingMallOrderTransformer.transform(updatedOrder);
}
