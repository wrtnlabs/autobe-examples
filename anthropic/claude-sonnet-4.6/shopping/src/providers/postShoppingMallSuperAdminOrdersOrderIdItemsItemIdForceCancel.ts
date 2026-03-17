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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { ShoppingMallOrderItemTransformer } from "../transformers/ShoppingMallOrderItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSuperAdminOrdersOrderIdItemsItemIdForceCancel(props: {
  superAdmin: SuperadminPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderItem.IForceCancel;
}): Promise<IShoppingMallOrderItem> {
  // 1. Validate order exists
  await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    select: { id: true },
  });
  // 2. Validate order item exists and belongs to this order
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findFirstOrThrow({
      where: {
        id: props.itemId,
        shopping_mall_order_id: props.orderId,
      },
      select: {
        id: true,
        shopping_mall_product_variant_id: true,
        quantity: true,
        status: true,
      },
    });
  // 3. Status eligibility check — cannot force-cancel terminal items
  if (orderItem.status === "cancelled" || orderItem.status === "refunded") {
    throw new HttpException(
      `Order item is already in terminal status '${orderItem.status}' and cannot be force-cancelled`,
      422,
    );
  }
  const now = new Date();
  // 4. Execute atomically
  await MyGlobal.prisma.$transaction(async (tx) => {
    // a. Set order item status to 'cancelled'
    await tx.shopping_mall_order_items.update({
      where: { id: props.itemId },
      data: {
        status: "cancelled",
        updated_at: now,
      },
    });
    // b. Restore stock via inventory record
    await tx.shopping_mall_inventory_records.create({
      data: {
        id: v4(),
        shopping_mall_product_variant_id:
          orderItem.shopping_mall_product_variant_id,
        quantity: orderItem.quantity,
        reason_type: "order_cancellation",
        note: null,
        created_at: now,
      },
    });
    // c. If a pending cancellation request exists, mark it approved for audit consistency
    const existingCancellationRequest =
      await tx.shopping_mall_cancellation_requests.findUnique({
        where: { shopping_mall_order_item_id: props.itemId },
        select: { id: true, status: true },
      });
    if (existingCancellationRequest?.status === "pending") {
      await tx.shopping_mall_cancellation_requests.update({
        where: { id: existingCancellationRequest.id },
        data: {
          status: "approved",
          updated_at: now,
        },
      });
    }
    // d. Recalculate parent order status from combined item statuses
    const allItems = await tx.shopping_mall_order_items.findMany({
      where: { shopping_mall_order_id: props.orderId },
      select: { status: true },
    });
    const statuses = allItems.map((item) => item.status);
    const allCancelled = statuses.every((s) => s === "cancelled");
    const allRefunded = statuses.every((s) => s === "refunded");
    const allTerminal = statuses.every(
      (s) => s === "cancelled" || s === "refunded",
    );
    const statusPriority: Record<string, number> = {
      pending: 0,
      paid: 1,
      shipped: 2,
      delivered: 3,
    };
    let newOrderStatus: string;
    if (allCancelled) {
      newOrderStatus = "cancelled";
    } else if (allRefunded) {
      newOrderStatus = "refunded";
    } else if (allTerminal) {
      // Mixed cancelled and refunded
      newOrderStatus = "partially_completed";
    } else {
      // At least one item still in active status
      const hasTerminalItem = statuses.some(
        (s) => s === "cancelled" || s === "refunded",
      );
      if (hasTerminalItem) {
        // Mix of active and terminal — partially completed
        newOrderStatus = "partially_completed";
      } else {
        // All items still active — pick the most advanced status
        const mostAdvanced = statuses.reduce(
          (best, s) =>
            (statusPriority[s] ?? -1) > (statusPriority[best] ?? -1) ? s : best,
          statuses[0],
        );
        newOrderStatus = mostAdvanced;
      }
    }
    // e. Persist recalculated order status
    await tx.shopping_mall_orders.update({
      where: { id: props.orderId },
      data: {
        status: newOrderStatus,
        updated_at: now,
      },
    });
  });
  // 5. Fetch and return the fully transformed updated order item
  const updatedItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.itemId },
      ...ShoppingMallOrderItemTransformer.select(),
    });
  return ShoppingMallOrderItemTransformer.transform(updatedItem);
}
