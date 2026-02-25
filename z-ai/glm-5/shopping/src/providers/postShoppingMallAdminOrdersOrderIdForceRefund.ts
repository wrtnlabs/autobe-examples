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

export async function postShoppingMallAdminOrdersOrderIdForceRefund(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrder.IForceRefund;
}): Promise<IShoppingMallOrder> {
  // Find the order
  const order = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    select: {
      id: true,
      order_number: true,
      orderItems: {
        select: {
          id: true,
          shopping_mall_product_variant_id: true,
          quantity: true,
        },
      },
    },
  });
  // Update all order items to 'refunded' status
  await MyGlobal.prisma.shopping_mall_order_items.updateMany({
    where: { shopping_mall_order_id: props.orderId },
    data: { status: "refunded" },
  });
  // Create inventory restoration records for each order item
  const now = new Date();
  for (const item of order.orderItems) {
    if (item.shopping_mall_product_variant_id !== null) {
      await MyGlobal.prisma.shopping_mall_product_inventory_histories.create({
        data: {
          id: v4(),
          shopping_mall_product_variant_id:
            item.shopping_mall_product_variant_id,
          quantity_change: item.quantity,
          reason: `Order force-refund - Order #${order.order_number}`,
          created_at: now,
        },
      });
    }
  }
  // Update order status to 'refunded'
  await MyGlobal.prisma.shopping_mall_orders.update({
    where: { id: props.orderId },
    data: {
      status: "refunded",
      updated_at: now,
    },
  });
  // Create admin audit log
  await MyGlobal.prisma.shopping_mall_admin_audit_logs.create({
    data: {
      id: v4(),
      shopping_mall_admin_id: props.admin.id,
      action: "order_force_refund",
      target_type: "order",
      target_id: props.orderId,
      details: JSON.stringify({
        reason: props.body.reason,
        order_number: order.order_number,
      }),
      ip: "0.0.0.0", // Placeholder - would need request context for real IP
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
