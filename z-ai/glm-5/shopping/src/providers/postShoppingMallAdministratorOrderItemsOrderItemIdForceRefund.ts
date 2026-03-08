import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallOrderItemTransformer } from "../transformers/ShoppingMallOrderItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdministratorOrderItemsOrderItemIdForceRefund(props: {
  administrator: AdministratorPayload;
  orderItemId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderItem.IForceRefund;
}): Promise<IShoppingMallOrderItem> {
  const now = new Date();
  // Execute all operations in transaction
  const orderItem = await MyGlobal.prisma.$transaction(async (tx) => {
    // Find the order item
    const item = await tx.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.orderItemId },
      select: {
        id: true,
        shopping_mall_order_id: true,
        shopping_mall_product_variant_id: true,
        status: true,
        quantity: true,
      },
    });
    // Validate status - cannot force refund if already cancelled or refunded
    if (item.status === "cancelled" || item.status === "refunded") {
      throw new HttpException(
        `Cannot force refund order item that is already ${item.status}`,
        400,
      );
    }
    // Check for existing pending refund request
    const existingRefundRequest =
      await tx.shopping_mall_refund_requests.findUnique({
        where: { shopping_mall_order_item_id: props.orderItemId },
      });
    // Close pending refund request if exists
    if (existingRefundRequest && existingRefundRequest.status === "pending") {
      await tx.shopping_mall_refund_requests.update({
        where: { id: existingRefundRequest.id },
        data: {
          status: "approved",
          responded_at: now,
        },
      });
    }
    // Create inventory record to restore stock
    await tx.shopping_mall_inventory_records.create({
      data: {
        id: v4(),
        variant_id: item.shopping_mall_product_variant_id,
        quantity_change: item.quantity,
        reason: `Administrator force refund: ${props.body.reason}`,
        created_at: now,
      },
    });
    // Update order item status to refunded
    await tx.shopping_mall_order_items.update({
      where: { id: props.orderItemId },
      data: {
        status: "refunded",
        updated_at: now,
      },
    });
    // Recalculate order status based on all items
    const allOrderItems = await tx.shopping_mall_order_items.findMany({
      where: { shopping_mall_order_id: item.shopping_mall_order_id },
      select: { status: true },
    });
    const statuses = allOrderItems.map((i) => i.status);
    let newOrderStatus: string;
    if (statuses.every((s) => s === "refunded")) {
      newOrderStatus = "refunded";
    } else if (statuses.every((s) => s === "cancelled")) {
      newOrderStatus = "cancelled";
    } else if (statuses.every((s) => s === "delivered")) {
      newOrderStatus = "delivered";
    } else if (statuses.every((s) => s === "shipped")) {
      newOrderStatus = "shipped";
    } else if (statuses.every((s) => s === "paid")) {
      newOrderStatus = "paid";
    } else {
      newOrderStatus = "partially_completed";
    }
    await tx.shopping_mall_orders.update({
      where: { id: item.shopping_mall_order_id },
      data: {
        status: newOrderStatus,
        updated_at: now,
      },
    });
    return item;
  });
  // Fetch and return the updated order item with all relations
  const updatedItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.orderItemId },
      ...ShoppingMallOrderItemTransformer.select(),
    });
  return await ShoppingMallOrderItemTransformer.transform(updatedItem);
}
