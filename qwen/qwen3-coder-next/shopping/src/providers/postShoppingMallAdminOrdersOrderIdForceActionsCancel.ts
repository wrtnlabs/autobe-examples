import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallOrderProductSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderProductSnapshots";
import { IShoppingMallOrderSellerProfileSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSellerProfileSnapshots";
import { IShoppingMallOrderVariantSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderVariantSnapshots";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallOrderAtOrderTransformer } from "../transformers/ShoppingMallOrderAtOrderTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdminOrdersOrderIdForceActionsCancel(props: {
  admin: AdminPayload;
  orderId: string;
  body: IShoppingMallOrder.IForceCancelRequest;
}): Promise<IShoppingMallOrder.IOrder> {
  // Find the order
  const order = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    include: {
      customer: true,
      shippingAddress: true,
      orderItems: {
        include: {
          productSnapshot: true,
          variantSnapshot: true,
          sellerProfileSnapshot: true,
        },
      },
    },
  });
  // Determine which items to cancel
  let itemsToCancel = order.orderItems;
  if (props.body.itemIds && props.body.itemIds.length > 0) {
    itemsToCancel = itemsToCancel.filter((item) =>
      props.body.itemIds?.includes(item.id),
    );
  }
  // Process cancellation for each item
  for (const item of itemsToCancel) {
    // Update order item status to cancelled
    await MyGlobal.prisma.shopping_mall_order_items.update({
      where: { id: item.id },
      data: {
        item_status: "cancelled" as const,
      },
    });
    // Create inventory history with administrator cancellation reason
    await MyGlobal.prisma.shopping_mall_inventory_histories.create({
      data: {
        id: v4(),
        shopping_mall_product_variant_id:
          item.shopping_mall_order_variant_snapshot_id,
        quantity_change: item.quantity,
        reason: "administrator cancellation" as const,
        created_at: toISOStringSafe(new Date()),
        metadata: JSON.stringify({
          admin_id: props.admin.id,
          reason: props.body.reason,
          cancellation_type: props.body.itemIds
            ? "specific_items"
            : "entire_order",
        }),
      },
    });
    // Create refund payment transaction for paid items
    if (item.item_status === "paid") {
      await MyGlobal.prisma.shopping_mall_refund_payments.create({
        data: {
          id: v4(),
          refund_request_id: v4(),
          order_item_id: item.id,
          customer_id: order.shopping_mall_customer_id,
          transaction_id: v4(),
          refund_amount: item.total_price,
          currency: "KRW" as const,
          status: "completed" as const,
          processed_at: toISOStringSafe(new Date()),
          reconciled: false,
        },
      });
    }
  }
  // Calculate new order status based on remaining items
  const remainingItems = order.orderItems.filter(
    (item) => !itemsToCancel.includes(item),
  );
  let newOrderStatus: string = order.status;
  if (remainingItems.length === 0) {
    newOrderStatus = "cancelled";
  } else {
    const itemStatuses = remainingItems.map((item) => item.item_status);
    if (itemStatuses.every((s) => s === "cancelled")) {
      newOrderStatus = "cancelled";
    } else if (itemStatuses.every((s) => s === "refunded")) {
      newOrderStatus = "refunded";
    } else if (itemStatuses.includes("shipped")) {
      newOrderStatus = "shipped";
    } else if (itemStatuses.includes("delivered")) {
      newOrderStatus = "delivered";
    } else {
      newOrderStatus = "partially_completed";
    }
  }
  // Update order status
  await MyGlobal.prisma.shopping_mall_orders.update({
    where: { id: props.orderId },
    data: {
      status: newOrderStatus,
    },
  });
  // Re-fetch order with nested relations for response using transformer
  const updatedOrder =
    await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
      where: { id: props.orderId },
      include: {
        customer: true,
        shippingAddress: true,
        orderItems: {
          include: {
            productSnapshot: true,
            variantSnapshot: true,
            sellerProfileSnapshot: true,
          },
        },
      },
    });
  // Transform the order using the transformer
  return await ShoppingMallOrderAtOrderTransformer.transform(updatedOrder);
}
