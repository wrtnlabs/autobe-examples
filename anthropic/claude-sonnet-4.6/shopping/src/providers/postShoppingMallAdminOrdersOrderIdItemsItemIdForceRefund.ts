import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { IShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImage";
import { IShoppingMallProductSnapshotSkus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSkus";
import { IShoppingMallProductSnapshotSkusOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSkusOption";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
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

export async function postShoppingMallAdminOrdersOrderIdItemsItemIdForceRefund(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderItem> {
  // Step 1: Verify order exists
  await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    select: { id: true },
  });
  // Step 2 & 3: Verify order item exists and belongs to order
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.itemId },
      select: {
        id: true,
        shopping_mall_order_id: true,
        shopping_mall_product_variant_id: true,
        quantity: true,
        status: true,
      },
    });
  if (orderItem.shopping_mall_order_id !== props.orderId) {
    throw new HttpException(
      `Order item ${props.itemId} does not belong to order ${props.orderId}`,
      422,
    );
  }
  // Step 4: Validate status is 'delivered' (reject terminal states)
  if (orderItem.status === "cancelled" || orderItem.status === "refunded") {
    throw new HttpException(
      `Order item cannot be force-refunded from its current status: ${orderItem.status}`,
      422,
    );
  }
  if (orderItem.status !== "delivered") {
    throw new HttpException(
      `Order item must be in 'delivered' status to be force-refunded, but current status is: ${orderItem.status}`,
      422,
    );
  }
  // Step 5: Execute all coordinated DB operations in a single transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // 5a. Update the order item status to 'refunded'
    await tx.shopping_mall_order_items.update({
      where: { id: props.itemId },
      data: {
        status: "refunded",
        updated_at: new Date(),
      },
    });
    // 5b. Insert inventory record to restore stock (positive quantity = stock increase)
    await tx.shopping_mall_inventory_records.create({
      data: {
        id: v4(),
        shopping_mall_product_variant_id:
          orderItem.shopping_mall_product_variant_id,
        quantity: orderItem.quantity,
        reason_type: "order_refund",
        note: null,
        created_at: new Date(),
      },
    });
    // 5c. Recalculate parent order derived status from all sibling items
    const allItems = await tx.shopping_mall_order_items.findMany({
      where: { shopping_mall_order_id: props.orderId },
      select: { status: true },
    });
    const statuses = allItems.map((item) => item.status);
    const uniqueStatuses = new Set(statuses);
    const terminalStatuses = new Set(["cancelled", "refunded", "delivered"]);
    let newOrderStatus: string;
    if (uniqueStatuses.size === 1 && uniqueStatuses.has("cancelled")) {
      newOrderStatus = "cancelled";
    } else if (uniqueStatuses.size === 1 && uniqueStatuses.has("refunded")) {
      newOrderStatus = "refunded";
    } else if (uniqueStatuses.size === 1 && uniqueStatuses.has("delivered")) {
      newOrderStatus = "delivered";
    } else if (statuses.every((s) => terminalStatuses.has(s))) {
      newOrderStatus = "partially_completed";
    } else if (statuses.some((s) => s === "shipped")) {
      newOrderStatus = "shipped";
    } else if (statuses.some((s) => s === "paid")) {
      newOrderStatus = "paid";
    } else {
      newOrderStatus = "partially_completed";
    }
    // 5d. Update parent order status and timestamp
    await tx.shopping_mall_orders.update({
      where: { id: props.orderId },
      data: {
        status: newOrderStatus,
        updated_at: new Date(),
      },
    });
  });
  // Step 6: Re-fetch the updated order item with all relations
  const updated =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.itemId },
      ...ShoppingMallOrderItemTransformer.select(),
    });
  // Step 7: Transform and return the full IShoppingMallOrderItem DTO
  return ShoppingMallOrderItemTransformer.transform(updated);
}
