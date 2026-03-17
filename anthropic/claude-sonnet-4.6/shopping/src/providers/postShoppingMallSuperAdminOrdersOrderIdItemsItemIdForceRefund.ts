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

export async function postShoppingMallSuperAdminOrdersOrderIdItemsItemIdForceRefund(props: {
  superAdmin: SuperadminPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderItem> {
  // 1. Verify the order exists
  await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    select: { id: true },
  });
  // 2. Verify the order item exists and belongs to this order
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
  // 3. Validate status — must be 'delivered'
  if (orderItem.status === "refunded" || orderItem.status === "cancelled") {
    throw new HttpException(
      `Order item cannot be force-refunded from its current status: '${orderItem.status}'`,
      422,
    );
  }
  if (orderItem.status !== "delivered") {
    throw new HttpException(
      `Order item must be in 'delivered' status to be force-refunded, current status: '${orderItem.status}'`,
      422,
    );
  }
  // 4. Execute transactional updates
  await MyGlobal.prisma.$transaction(async (tx) => {
    // 4a. Update order item status to 'refunded'
    await tx.shopping_mall_order_items.update({
      where: { id: props.itemId },
      data: {
        status: "refunded",
        updated_at: new Date(),
      },
    });
    // 4b. Insert inventory record to restore stock (positive quantity = restoring)
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
    // 4c. Recalculate order status from all sibling items (including just-updated item)
    const allItems = await tx.shopping_mall_order_items.findMany({
      where: { shopping_mall_order_id: props.orderId },
      select: { status: true },
    });
    const statuses = allItems.map((item) => item.status);
    const derivedStatus = deriveOrderStatus(statuses);
    // 4d. Update parent order derived status
    await tx.shopping_mall_orders.update({
      where: { id: props.orderId },
      data: {
        status: derivedStatus,
        updated_at: new Date(),
      },
    });
  });
  // 5. Fetch and return the fully populated updated order item
  const updated =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.itemId },
      ...ShoppingMallOrderItemTransformer.select(),
    });
  return ShoppingMallOrderItemTransformer.transform(updated);
}
function deriveOrderStatus(statuses: string[]): string {
  if (statuses.length === 0) return "partially_completed";
  if (statuses.every((s) => s === "cancelled")) return "cancelled";
  if (statuses.every((s) => s === "refunded")) return "refunded";
  if (statuses.every((s) => s === "delivered")) return "delivered";
  const terminalStates = new Set(["cancelled", "refunded", "delivered"]);
  if (statuses.every((s) => terminalStates.has(s)))
    return "partially_completed";
  if (statuses.some((s) => s === "pending")) return "pending";
  if (statuses.some((s) => s === "paid")) return "paid";
  if (statuses.some((s) => s === "shipped")) return "shipped";
  return "partially_completed";
}
