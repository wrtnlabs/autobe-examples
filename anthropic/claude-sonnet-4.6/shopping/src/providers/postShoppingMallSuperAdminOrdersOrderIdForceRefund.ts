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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { ShoppingMallOrderTransformer } from "../transformers/ShoppingMallOrderTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSuperAdminOrdersOrderIdForceRefund(props: {
  superAdmin: SuperadminPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrder.IForceRefund;
}): Promise<IShoppingMallOrder> {
  // 1. Order lookup — auto 404 if not found
  await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    select: { id: true },
  });
  // 2. Determine target order items
  let targetItems: Array<{
    id: string;
    shopping_mall_product_variant_id: string;
    quantity: number;
    status: string;
  }>;
  if (props.body.refundAll === true) {
    // Fetch ALL items for this order
    targetItems = await MyGlobal.prisma.shopping_mall_order_items.findMany({
      where: { shopping_mall_order_id: props.orderId },
      select: {
        id: true,
        shopping_mall_product_variant_id: true,
        quantity: true,
        status: true,
      },
    });
  } else {
    // Fetch only the specified items
    const ids = props.body.orderItemIds ?? [];
    if (ids.length === 0) {
      throw new HttpException(
        "No order item IDs provided and refundAll is false",
        422,
      );
    }
    targetItems = await MyGlobal.prisma.shopping_mall_order_items.findMany({
      where: {
        id: { in: ids },
        shopping_mall_order_id: props.orderId,
      },
      select: {
        id: true,
        shopping_mall_product_variant_id: true,
        quantity: true,
        status: true,
      },
    });
    // Validate all requested IDs belong to this order
    if (targetItems.length !== ids.length) {
      throw new HttpException(
        "One or more order item IDs do not belong to the specified order",
        422,
      );
    }
  }
  if (targetItems.length === 0) {
    throw new HttpException("No order items found for this order", 422);
  }
  // 3. Eligibility validation — reject if any item is already cancelled or refunded
  const ineligibleItems = targetItems.filter(
    (item) => item.status === "cancelled" || item.status === "refunded",
  );
  if (ineligibleItems.length > 0) {
    throw new HttpException(
      `Cannot force-refund items that are already in terminal status. Ineligible item IDs: ${ineligibleItems.map((i) => i.id).join(", ")}`,
      422,
    );
  }
  const now = new Date();
  const targetIds = targetItems.map((item) => item.id);
  // 4. Execute atomically in a transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // 4a. Update each target item status to 'refunded'
    await tx.shopping_mall_order_items.updateMany({
      where: { id: { in: targetIds } },
      data: {
        status: "refunded",
        updated_at: now,
      },
    });
    // 4b. Create inventory records restoring stock for each refunded item
    await tx.shopping_mall_inventory_records.createMany({
      data: targetItems.map((item) => ({
        id: v4(),
        shopping_mall_product_variant_id: item.shopping_mall_product_variant_id,
        quantity: item.quantity, // positive — restores stock
        reason_type: "order_refund",
        note: null,
        created_at: now,
      })),
    });
    // 4c. Fetch all order items to recompute order status
    const allItems = await tx.shopping_mall_order_items.findMany({
      where: { shopping_mall_order_id: props.orderId },
      select: { id: true, status: true },
    });
    const newOrderStatus = deriveOrderStatus(allItems.map((i) => i.status));
    // 4d. Update order status
    await tx.shopping_mall_orders.update({
      where: { id: props.orderId },
      data: {
        status: newOrderStatus,
        updated_at: now,
      },
    });
  });
  // 5. Fetch and return the complete updated order
  const updatedOrder =
    await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
      where: { id: props.orderId },
      ...ShoppingMallOrderTransformer.select(),
    });
  return await ShoppingMallOrderTransformer.transform(updatedOrder);
}
function deriveOrderStatus(statuses: string[]): string {
  if (statuses.length === 0) return "partially_completed";
  const unique = Array.from(new Set(statuses));
  // All items have the same status
  if (unique.length === 1) return unique[0];
  // Mixed statuses — check if all are terminal
  const terminalStatuses = new Set(["cancelled", "refunded", "delivered"]);
  const allTerminal = statuses.every((s) => terminalStatuses.has(s));
  if (allTerminal) return "partially_completed";
  // Non-terminal mix (e.g. some paid, some shipped)
  return "partially_completed";
}
