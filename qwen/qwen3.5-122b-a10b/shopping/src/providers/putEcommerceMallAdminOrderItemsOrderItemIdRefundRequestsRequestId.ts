import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallOrderItemRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemRefundRequest";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallOrderItemRefundRequestTransformer } from "../transformers/EcommerceMallOrderItemRefundRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallAdminOrderItemsOrderItemIdRefundRequestsRequestId(props: {
  admin: AdminPayload;
  orderItemId: string & tags.Format<"uuid">;
  requestId: string & tags.Format<"uuid">;
  body: IEcommerceMallOrderItemRefundRequest.IUpdate;
}): Promise<IEcommerceMallOrderItemRefundRequest> {
  const now = new Date();
  const nowIso = now.toISOString();
  // 1. Load refund request and verify it belongs to orderItemId
  const refundRequest =
    await MyGlobal.prisma.ecommerce_mall_order_item_refund_requests.findFirst({
      where: {
        id: props.requestId,
        ecommerce_mall_order_item_id: props.orderItemId,
        deleted_at: null,
      },
    });
  if (!refundRequest) {
    throw new HttpException("Refund request not found", 404);
  }
  // 2. Load order item for business validation
  const orderItem = await MyGlobal.prisma.ecommerce_mall_order_items.findUnique(
    {
      where: { id: props.orderItemId },
      include: {
        order: true,
      },
    },
  );
  if (!orderItem) {
    throw new HttpException("Order item not found", 404);
  }
  // 3. Build update data
  const updateData: Prisma.ecommerce_mall_order_item_refund_requestsUpdateInput =
    {};
  // Admin can only update status, not reason
  if (props.body.status !== undefined) {
    // Validate status enum
    if (!["pending", "approved", "rejected"].includes(props.body.status)) {
      throw new HttpException(
        "Invalid status value. Must be 'pending', 'approved', or 'rejected'",
        400,
      );
    }
    updateData.status = props.body.status;
  }
  // 4. Execute transaction for approval actions
  if (props.body.status === "approved" && refundRequest.status === "pending") {
    await MyGlobal.prisma.$transaction(async (tx) => {
      // 4a. Calculate new current stock before inserting inventory record
      const existingRecords =
        await tx.ecommerce_mall_inventory_records.findMany({
          where: {
            ecommerce_mall_product_variant_id:
              orderItem.ecommerce_mall_product_variant_id,
            deleted_at: null,
          },
        });
      const currentStockBefore = existingRecords.reduce(
        (sum, record) => sum + record.quantity_change,
        0,
      );
      const newCurrentStock = currentStockBefore + orderItem.quantity;
      // 4b. Update refund request with responded_at
      await tx.ecommerce_mall_order_item_refund_requests.update({
        where: { id: props.requestId },
        data: {
          ...updateData,
          responded_at: now,
          updated_at: now,
        },
      });
      // 4c. Update order item status to refunded
      await tx.ecommerce_mall_order_items.update({
        where: { id: props.orderItemId },
        data: {
          status: "refunded",
          updated_at: now,
        },
      });
      // 4d. Create inventory record for stock restoration
      await tx.ecommerce_mall_inventory_records.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          ecommerce_mall_product_variant_id:
            orderItem.ecommerce_mall_product_variant_id,
          quantity_change: orderItem.quantity,
          reason: "refund_approved",
          recorded_at: now,
          current_stock: newCurrentStock,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      });
      // 4e. Update parent order status based on all order items
      const orderItems = await tx.ecommerce_mall_order_items.findMany({
        where: {
          ecommerce_mall_order_id: orderItem.ecommerce_mall_order_id,
          deleted_at: null,
        },
      });
      const allRefunded = orderItems.every(
        (item) => item.status === "refunded",
      );
      const allCancelled = orderItems.every(
        (item) => item.status === "cancelled",
      );
      const hasRefunded = orderItems.some((item) => item.status === "refunded");
      const hasCancelled = orderItems.some(
        (item) => item.status === "cancelled",
      );
      let newOrderStatus: string = orderItem.order.status;
      if (allRefunded) {
        newOrderStatus = "refunded";
      } else if (allCancelled) {
        newOrderStatus = "cancelled";
      } else if (hasRefunded || hasCancelled) {
        newOrderStatus = "partiallyCompleted";
      }
      await tx.ecommerce_mall_orders.update({
        where: { id: orderItem.ecommerce_mall_order_id },
        data: {
          status: newOrderStatus,
          updated_at: now,
        },
      });
      // 4f. Create refund request snapshot
      await tx.ecommerce_mall_order_item_snapshots.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          order_item_id: props.orderItemId,
          changed_by_id: props.admin.id,
          snapshot_type: "refund",
          created_at: now,
          previous_values: JSON.stringify({
            status: refundRequest.status,
            reason: refundRequest.reason,
            requested_at: refundRequest.requested_at,
            responded_at: refundRequest.responded_at,
            days_since_delivery: refundRequest.days_since_delivery,
          }),
          current_values: JSON.stringify({
            status: props.body.status,
            reason: refundRequest.reason,
            requested_at: refundRequest.requested_at,
            responded_at: nowIso,
            days_since_delivery: refundRequest.days_since_delivery,
          }),
        },
      });
    });
  } else if (
    props.body.status === "rejected" &&
    refundRequest.status === "pending"
  ) {
    // Rejection path - just update status and create snapshot
    await MyGlobal.prisma.$transaction(async (tx) => {
      await tx.ecommerce_mall_order_item_refund_requests.update({
        where: { id: props.requestId },
        data: {
          ...updateData,
          responded_at: now,
          updated_at: now,
        },
      });
      // Create snapshot for rejection
      await tx.ecommerce_mall_order_item_snapshots.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          order_item_id: props.orderItemId,
          changed_by_id: props.admin.id,
          snapshot_type: "refund",
          created_at: now,
          previous_values: JSON.stringify({
            status: refundRequest.status,
            reason: refundRequest.reason,
            requested_at: refundRequest.requested_at,
            responded_at: refundRequest.responded_at,
            days_since_delivery: refundRequest.days_since_delivery,
          }),
          current_values: JSON.stringify({
            status: props.body.status,
            reason: refundRequest.reason,
            requested_at: refundRequest.requested_at,
            responded_at: nowIso,
            days_since_delivery: refundRequest.days_since_delivery,
          }),
        },
      });
    });
  } else if (
    updateData.status !== undefined &&
    refundRequest.status !== "pending"
  ) {
    // Cannot change status after response
    throw new HttpException(
      "Refund request already responded and cannot be modified",
      409,
    );
  }
  // 5. Load updated refund request and transform
  const updated =
    await MyGlobal.prisma.ecommerce_mall_order_item_refund_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        ...EcommerceMallOrderItemRefundRequestTransformer.select(),
      },
    );
  return await EcommerceMallOrderItemRefundRequestTransformer.transform(
    updated,
  );
}
