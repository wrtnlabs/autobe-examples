import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
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
import { ShoppingMallOrderTransformer } from "../transformers/ShoppingMallOrderTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdminOrdersOrderIdForceRefund(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrder.IForceRefund;
}): Promise<IShoppingMallOrder> {
  // 1. Verify order exists
  await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    select: { id: true },
  });
  // 2. Fetch all order items for this order
  const allItems = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where: { shopping_mall_order_id: props.orderId },
    select: {
      id: true,
      status: true,
      quantity: true,
      shopping_mall_product_variant_id: true,
    },
  });
  // 3. Determine target items
  let targetItems: typeof allItems;
  if (props.body.refundAll) {
    targetItems = allItems;
  } else {
    const requestedIds = props.body.orderItemIds ?? [];
    if (requestedIds.length === 0) {
      throw new HttpException(
        "No order item IDs provided and refundAll is false",
        422,
      );
    }
    const allItemIds = new Set(allItems.map((item) => item.id));
    const invalidIds = requestedIds.filter((id) => !allItemIds.has(id));
    if (invalidIds.length > 0) {
      throw new HttpException(
        `Order item IDs do not belong to order ${props.orderId}: ${invalidIds.join(", ")}`,
        422,
      );
    }
    targetItems = allItems.filter((item) => requestedIds.includes(item.id));
  }
  // 4. Eligibility validation: reject if any target item is cancelled or refunded
  const ineligibleItems = targetItems.filter(
    (item) => item.status === "cancelled" || item.status === "refunded",
  );
  if (ineligibleItems.length > 0) {
    throw new HttpException(
      `Cannot force-refund items already in terminal status. Ineligible items: ${ineligibleItems.map((i) => `${i.id} (${i.status})`).join(", ")}`,
      422,
    );
  }
  if (targetItems.length === 0) {
    throw new HttpException("No eligible items to refund in this order", 422);
  }
  const targetIds = targetItems.map((item) => item.id);
  const now = new Date();
  // 5. Execute all mutations atomically
  await MyGlobal.prisma.$transaction(async (tx) => {
    // 5a. Mark target items as refunded
    await tx.shopping_mall_order_items.updateMany({
      where: { id: { in: targetIds } },
      data: { status: "refunded", updated_at: now },
    });
    // 5b. Restore stock via inventory records
    await tx.shopping_mall_inventory_records.createMany({
      data: targetItems.map((item) => ({
        id: v4(),
        shopping_mall_product_variant_id: item.shopping_mall_product_variant_id,
        quantity: item.quantity,
        reason_type: "order_refund",
        note: null,
        created_at: now,
      })),
    });
    // 5c. Re-fetch ALL items for order to compute derived status
    const allUpdatedStatuses = await tx.shopping_mall_order_items.findMany({
      where: { shopping_mall_order_id: props.orderId },
      select: { status: true },
    });
    // 5d. Derive and cache new order status
    const newOrderStatus = deriveOrderStatus(
      allUpdatedStatuses.map((i) => i.status),
    );
    await tx.shopping_mall_orders.update({
      where: { id: props.orderId },
      data: { status: newOrderStatus, updated_at: now },
    });
  });
  // 6. Return complete updated order record
  const updatedOrder =
    await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
      where: { id: props.orderId },
      ...ShoppingMallOrderTransformer.select(),
    });
  return ShoppingMallOrderTransformer.transform(updatedOrder);
}
function deriveOrderStatus(statuses: string[]): string {
  if (statuses.length === 0) return "partially_completed";
  const uniqueSet = new Set(statuses);
  if (uniqueSet.size === 1) {
    const sole = Array.from(uniqueSet)[0];
    return sole !== undefined ? sole : "partially_completed";
  }
  // Non-terminal statuses take priority (order of progression)
  if (statuses.some((s) => s === "pending")) return "pending";
  if (statuses.some((s) => s === "paid")) return "paid";
  if (statuses.some((s) => s === "shipped")) return "shipped";
  // Mix of terminal statuses only (delivered, cancelled, refunded)
  return "partially_completed";
}
