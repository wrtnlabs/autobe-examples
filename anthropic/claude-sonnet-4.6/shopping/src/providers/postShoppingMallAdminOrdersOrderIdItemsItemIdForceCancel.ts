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

export async function postShoppingMallAdminOrdersOrderIdItemsItemIdForceCancel(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderItem.IForceCancel;
}): Promise<IShoppingMallOrderItem> {
  // 1. Validate order exists
  await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    select: { id: true },
  });
  // 2. Validate order item exists and belongs to the order
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findFirstOrThrow({
      where: {
        id: props.itemId,
        shopping_mall_order_id: props.orderId,
      },
      select: {
        id: true,
        status: true,
        quantity: true,
        shopping_mall_product_variant_id: true,
      },
    });
  // 3. Status eligibility check — already terminal states cannot be force-cancelled
  if (orderItem.status === "cancelled" || orderItem.status === "refunded") {
    throw new HttpException(
      `Order item is already in '${orderItem.status}' status and cannot be force-cancelled.`,
      422,
    );
  }
  // 4. Execute atomic transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // 4a. Update order item status to 'cancelled'
    await tx.shopping_mall_order_items.update({
      where: { id: props.itemId },
      data: {
        status: "cancelled",
        updated_at: new Date(),
      },
    });
    // 4b. Insert inventory record to restore stock quantity
    await tx.shopping_mall_inventory_records.create({
      data: {
        id: v4(),
        shopping_mall_product_variant_id:
          orderItem.shopping_mall_product_variant_id,
        quantity: orderItem.quantity,
        reason_type: "order_cancellation",
        note: null,
        created_at: new Date(),
      },
    });
    // 4c. Update any pending cancellation request to 'approved' for audit consistency
    await tx.shopping_mall_cancellation_requests.updateMany({
      where: {
        shopping_mall_order_item_id: props.itemId,
        status: "pending",
      },
      data: {
        status: "approved",
        updated_at: new Date(),
      },
    });
    // 4d. Query all sibling items to recalculate the parent order's derived status
    const allItems = await tx.shopping_mall_order_items.findMany({
      where: { shopping_mall_order_id: props.orderId },
      select: { id: true, status: true },
    });
    // Apply the updated status to the current item in our local view
    const statuses = allItems.map((item) =>
      item.id === props.itemId ? "cancelled" : item.status,
    );
    const newOrderStatus = calculateOrderStatus(statuses);
    await tx.shopping_mall_orders.update({
      where: { id: props.orderId },
      data: {
        status: newOrderStatus,
        updated_at: new Date(),
      },
    });
  });
  // 5. Fetch the updated order item with full nested details and return
  const updated =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.itemId },
      ...ShoppingMallOrderItemTransformer.select(),
    });
  return await ShoppingMallOrderItemTransformer.transform(updated);
}
function calculateOrderStatus(statuses: string[]): string {
  const terminalStatuses = new Set(["cancelled", "refunded"]);
  const activeStatusPriority = ["delivered", "shipped", "paid", "pending"];
  const allCancelled = statuses.every((s) => s === "cancelled");
  const allRefunded = statuses.every((s) => s === "refunded");
  const allTerminal = statuses.every((s) => terminalStatuses.has(s));
  const hasActive = statuses.some((s) => !terminalStatuses.has(s));
  const hasTerminal = statuses.some((s) => terminalStatuses.has(s));
  if (allCancelled) return "cancelled";
  if (allRefunded) return "refunded";
  if (allTerminal) return "partially_completed";
  if (hasActive && hasTerminal) return "partially_completed";
  // All items are active — return the most advanced active status
  for (const activeStatus of activeStatusPriority) {
    if (statuses.includes(activeStatus)) {
      return activeStatus;
    }
  }
  return "paid";
}
