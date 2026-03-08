import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallRefundRequestTransformer } from "../transformers/ShoppingMallRefundRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallSellerRefundRequestsRefundRequestId(props: {
  seller: SellerPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IShoppingMallRefundRequest.IUpdate;
}): Promise<IShoppingMallRefundRequest> {
  // 1. Retrieve refund request with order item and product for authorization
  const refundRequest =
    await MyGlobal.prisma.shopping_mall_refund_requests.findUniqueOrThrow({
      where: { id: props.refundRequestId },
      select: {
        id: true,
        reason: true,
        status: true,
        created_at: true,
        responded_at: true,
        shopping_mall_order_item_id: true,
        orderItem: {
          select: {
            id: true,
            quantity: true,
            shopping_mall_product_variant_id: true,
            shopping_mall_seller_id: true,
            shopping_mall_order_id: true,
          },
        },
      },
    });
  // 2. Authorization: seller must own the product
  if (refundRequest.orderItem.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Status validation: must be pending
  if (refundRequest.status !== "pending") {
    throw new HttpException("Refund request already resolved", 400);
  }
  // 4. Determine new status
  const newStatus: "approved" | "rejected" =
    props.body.decision === "approve" ? "approved" : "rejected";
  const now = new Date();
  // 5. Process in transaction for atomicity
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Update refund request
    await tx.shopping_mall_refund_requests.update({
      where: { id: props.refundRequestId },
      data: {
        status: newStatus,
        responded_at: now,
      },
    });
    // Create snapshot for audit trail
    await tx.shopping_mall_refund_request_snapshots.create({
      data: {
        id: v4(),
        shopping_mall_refund_request_id: props.refundRequestId,
        reason: refundRequest.reason,
        status: newStatus,
        created_at: now,
      },
    });
    // Handle approval case
    if (props.body.decision === "approve") {
      // Update order item status to refunded
      await tx.shopping_mall_order_items.update({
        where: { id: refundRequest.shopping_mall_order_item_id },
        data: {
          status: "refunded",
          updated_at: now,
        },
      });
      // Create positive inventory record for stock restoration
      await tx.shopping_mall_inventory_records.create({
        data: {
          id: v4(),
          variant_id: refundRequest.orderItem.shopping_mall_product_variant_id,
          refund_request_id: props.refundRequestId,
          quantity_change: refundRequest.orderItem.quantity,
          reason: "Refund approved",
          created_at: now,
        },
      });
      // Recalculate parent order status
      const orderItems = await tx.shopping_mall_order_items.findMany({
        where: {
          shopping_mall_order_id:
            refundRequest.orderItem.shopping_mall_order_id,
        },
        select: { status: true },
      });
      const itemStatuses = orderItems.map((item) => item.status);
      const orderStatus = calculateOrderStatus(itemStatuses);
      await tx.shopping_mall_orders.update({
        where: { id: refundRequest.orderItem.shopping_mall_order_id },
        data: { status: orderStatus },
      });
    }
  });
  // 6. Return updated refund request using transformer
  const updated =
    await MyGlobal.prisma.shopping_mall_refund_requests.findUniqueOrThrow({
      where: { id: props.refundRequestId },
      ...ShoppingMallRefundRequestTransformer.select(),
    });
  return await ShoppingMallRefundRequestTransformer.transform(updated);
}
function calculateOrderStatus(itemStatuses: string[]): string {
  if (itemStatuses.length === 0) return "paid";
  if (itemStatuses.every((s) => s === "paid")) return "paid";
  if (itemStatuses.every((s) => s === "delivered")) return "delivered";
  if (itemStatuses.every((s) => s === "cancelled")) return "cancelled";
  if (itemStatuses.every((s) => s === "refunded")) return "refunded";
  if (itemStatuses.some((s) => s === "shipped")) return "shipped";
  return "partially_completed";
}
