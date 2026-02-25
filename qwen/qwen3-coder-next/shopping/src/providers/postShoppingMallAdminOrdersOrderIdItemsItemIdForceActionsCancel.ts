import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
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
import { ShoppingMallOrderItemTransformer } from "../transformers/ShoppingMallOrderItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function postShoppingMallAdminOrdersOrderIdItemsItemIdForceActionsCancel(props: {
  admin: AdminPayload;
  orderId: string;
  itemId: string;
  body: IShoppingMallOrderItem.IForceCancelRequest;
}): Promise<IShoppingMallOrderItem> {
  // Load order and verify it exists
  const order = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
  });
  // Load order item and verify it belongs to the order
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.itemId },
      select: {
        id: true,
        quantity: true,
        unit_price: true,
        item_status: true,
        shopping_mall_order_product_snapshot_id: true,
        shopping_mall_order_variant_snapshot_id: true,
        shopping_mall_order_seller_profile_snapshot_id: true,
        shopping_mall_order_id: true,
      },
    });
  // Validate item status allows cancellation
  if (orderItem.item_status !== "paid" && orderItem.item_status !== "shipped") {
    throw new HttpException(
      `Order item with status '${orderItem.item_status}' cannot be cancelled`,
      409,
    );
  }
  // Load customer_id from order
  const customer_id = order.shopping_mall_customer_id;
  // Process refund - create refund payment record with all required fields
  const refundPayment =
    await MyGlobal.prisma.shopping_mall_refund_payments.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        refund_request_id: v4() as string & tags.Format<"uuid">,
        order_item_id: props.itemId,
        customer_id: customer_id as string & tags.Format<"uuid">,
        transaction_id: v4(),
        currency: "KRW",
        refund_amount: orderItem.unit_price * orderItem.quantity,
        status: "refunded",
        reconciled: false,
        // Remove created_at field as it doesn't exist in the database schema
      },
    });
  // Restore inventory via positive inventory history record
  const inventoryRecord =
    await MyGlobal.prisma.shopping_mall_inventory_histories.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        shopping_mall_product_variant_id:
          orderItem.shopping_mall_order_variant_snapshot_id,
        quantity_change: orderItem.quantity,
        reason: "administrator cancellation",
        shopping_mall_order_item_id: props.itemId,
        created_at: toISOStringSafe(new Date()),
      },
    });
  // Update order item status to 'cancelled'
  const updatedItem = await MyGlobal.prisma.shopping_mall_order_items.update({
    where: { id: props.itemId },
    data: {
      item_status: "cancelled",
    },
  });
  // Recalculate order status based on remaining items
  const remainingItems =
    await MyGlobal.prisma.shopping_mall_order_items.findMany({
      where: {
        shopping_mall_order_id: props.orderId,
        id: { not: props.itemId },
      },
      select: { item_status: true },
    });
  const allItemsCancelled = remainingItems.every(
    (item) => item.item_status === "cancelled",
  );
  const allItemsRefunded = remainingItems.every(
    (item) => item.item_status === "refunded",
  );
  if (allItemsCancelled) {
    await MyGlobal.prisma.shopping_mall_orders.update({
      where: { id: props.orderId },
      data: { status: "cancelled" },
    });
  } else if (allItemsRefunded) {
    await MyGlobal.prisma.shopping_mall_orders.update({
      where: { id: props.orderId },
      data: { status: "refunded" },
    });
  }
  // Return updated order item with transformer
  return await ShoppingMallOrderItemTransformer.transform(
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.itemId },
      ...ShoppingMallOrderItemTransformer.select(),
    }),
  );
}
