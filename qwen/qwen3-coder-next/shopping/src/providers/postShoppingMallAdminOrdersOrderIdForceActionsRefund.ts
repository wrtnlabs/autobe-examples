import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallOrderProductSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderProductSnapshots";
import { IShoppingMallOrderSellerProfileSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSellerProfileSnapshots";
import { IShoppingMallOrderStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderStatusLog";
import { IShoppingMallOrderVariantSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderVariantSnapshots";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
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

export async function postShoppingMallAdminOrdersOrderIdForceActionsRefund(props: {
  admin: AdminPayload;
  orderId: string;
  body: IShoppingMallOrder.IRequest;
}): Promise<IShoppingMallOrder> {
  // Verify the order exists
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirstOrThrow({
    where: {
      id: props.orderId,
    },
    ...ShoppingMallOrderTransformer.select(),
  });
  // Validate order status for refund (must be paid, shipped, or delivered)
  if (!["paid", "shipped", "delivered"].includes(order.status)) {
    throw new HttpException(
      `Order cannot be refunded with current status: ${order.status}`,
      400,
    );
  }
  // Get all order items
  const orderItems = order.orderItems;
  // Update each order item to 'refunded' status
  const now = new Date();
  const nowISOString = toISOStringSafe(now);
  // Update inventory for each order item
  for (const item of orderItems) {
    // Restore inventory quantity
    await MyGlobal.prisma.shopping_mall_inventory_histories.create({
      data: {
        id: v4(),
        shopping_mall_product_variant_id: item.variantSnapshot.id,
        quantity_change: item.quantity,
        reason: "administrator refund",
        shopping_mall_order_item_id: item.id,
        created_at: nowISOString,
      },
    });
    // Update order item status to 'refunded'
    await MyGlobal.prisma.shopping_mall_order_items.update({
      where: {
        id: item.id,
      },
      data: {
        item_status: "refunded" as const,
      },
    });
    // Create refund request first
    const refundRequest =
      await MyGlobal.prisma.shopping_mall_order_refund_requests.create({
        data: {
          id: v4(),
          shopping_mall_order_item_id: item.id,
          shopping_mall_customer_id: order.shopping_mall_customer_id,
          shopping_mall_seller_id: item.sellerProfileSnapshot.id,
          shopping_mall_customer_session_id: v4(),
          reason: "Administrator force refund",
          created_at: nowISOString,
          status: "approved",
          approved_at: nowISOString,
        },
      });
    // Create refund payment record with correct fields
    await MyGlobal.prisma.shopping_mall_refund_payments.create({
      data: {
        id: v4(),
        refund_request_id: refundRequest.id,
        order_item_id: item.id,
        customer_id: order.shopping_mall_customer_id,
        seller_id: item.sellerProfileSnapshot.id,
        transaction_id: v4(),
        refund_amount: item.total_price,
        currency: "KRW",
        refund_reason: "Administrator force refund",
        status: "completed",
        processed_at: nowISOString,
        reconciled: false,
      },
    });
  }
  // Update order status to 'refunded' if all items are now refunded
  const updatedOrderItems =
    await MyGlobal.prisma.shopping_mall_order_items.findMany({
      where: {
        shopping_mall_order_id: props.orderId,
      },
      select: {
        item_status: true,
      },
    });
  const allRefunded = updatedOrderItems.every(
    (item) => item.item_status === "refunded",
  );
  if (allRefunded) {
    await MyGlobal.prisma.shopping_mall_orders.update({
      where: {
        id: props.orderId,
      },
      data: {
        status: "refunded" as const,
      },
    });
    // Log the administrator action
    await MyGlobal.prisma.shopping_mall_order_status_logs.create({
      data: {
        id: v4(),
        shopping_mall_order_id: props.orderId,
        previous_status: order.status,
        new_status: "refunded",
        reason: `Administrator refund requested: ${"reason" in props.body ? props.body.reason : "No reason provided"}`,
        created_at: nowISOString,
        changed_by: props.admin.id,
      },
    });
  }
  // Get updated order with all changes
  const updatedOrder =
    await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
      where: {
        id: props.orderId,
      },
      ...ShoppingMallOrderTransformer.select(),
    });
  return await ShoppingMallOrderTransformer.transform(updatedOrder);
}
