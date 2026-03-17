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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallOrderItemRefundRequestTransformer } from "../transformers/EcommerceMallOrderItemRefundRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallSellerOrderItemsOrderItemIdRefundRequestsRequestId(props: {
  seller: SellerPayload;
  orderItemId: string & tags.Format<"uuid">;
  requestId: string & tags.Format<"uuid">;
  body: IEcommerceMallOrderItemRefundRequest.IUpdate;
}): Promise<IEcommerceMallOrderItemRefundRequest> {
  // 1. Load refund request and verify it exists
  const refundRequest =
    await MyGlobal.prisma.ecommerce_mall_order_item_refund_requests.findUnique({
      where: { id: props.requestId },
    });
  if (!refundRequest) {
    throw new HttpException("Refund request not found", 404);
  }
  // 2. Verify refund request belongs to the specified order item
  if (refundRequest.ecommerce_mall_order_item_id !== props.orderItemId) {
    throw new HttpException(
      "Refund request does not belong to the specified order item",
      400,
    );
  }
  // 3. Load order item to verify ownership and status
  const orderItem = await MyGlobal.prisma.ecommerce_mall_order_items.findUnique(
    {
      where: { id: props.orderItemId },
      include: {
        productVariant: true,
      },
    },
  );
  if (!orderItem) {
    throw new HttpException("Order item not found", 404);
  }
  // 4. Verify seller owns the product variant in the order item
  const product = await MyGlobal.prisma.ecommerce_mall_products.findUnique({
    where: { id: orderItem.productVariant.ecommerce_mall_product_id },
    select: { seller_id: true },
  });
  if (!product || product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 5. Check if refund request already responded (not pending)
  if (refundRequest.status !== "pending") {
    throw new HttpException("Refund request already responded", 409);
  }
  // 6. Validate status update if provided
  let newStatus = refundRequest.status;
  let newRespondedAt: Date | null = refundRequest.responded_at;
  if (props.body.status !== undefined) {
    // Validate status enum
    if (!typia.is<"pending" | "approved" | "rejected">(props.body.status)) {
      throw new HttpException("Invalid status value", 400);
    }
    // Seller can only change from pending to approved or rejected
    if (props.body.status === "pending") {
      throw new HttpException("Cannot change status to pending", 400);
    }
    newStatus = props.body.status;
    newRespondedAt = new Date();
    // If approving, validate order item status is delivered
    if (newStatus === "approved" && orderItem.status !== "delivered") {
      throw new HttpException(
        "Order item must be delivered to approve refund",
        400,
      );
    }
  }
  // 7. Validate reason update if provided (seller cannot modify reason)
  if (props.body.reason !== undefined) {
    throw new HttpException("Seller cannot modify refund reason", 403);
  }
  // 8. Execute update in transaction
  const updated = await MyGlobal.prisma.$transaction(async (tx) => {
    // Update refund request
    const updatedRequest =
      await tx.ecommerce_mall_order_item_refund_requests.update({
        where: { id: props.requestId },
        data: {
          ...(props.body.status !== undefined && { status: props.body.status }),
          ...(props.body.status !== undefined && {
            responded_at: newRespondedAt,
          }),
          updated_at: new Date(),
        },
      });
    // If approved, create inventory record and update order item
    if (newStatus === "approved") {
      // Create inventory record to restore stock
      const quantityChange = orderItem.quantity;
      // Calculate current stock from existing inventory records
      const existingRecords =
        await tx.ecommerce_mall_inventory_records.findMany({
          where: {
            ecommerce_mall_product_variant_id:
              orderItem.ecommerce_mall_product_variant_id,
            deleted_at: null,
          },
          select: { quantity_change: true },
        });
      const currentStock =
        existingRecords.reduce(
          (sum, record) => sum + record.quantity_change,
          0,
        ) + quantityChange;
      await tx.ecommerce_mall_inventory_records.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          ecommerce_mall_product_variant_id:
            orderItem.ecommerce_mall_product_variant_id,
          quantity_change: quantityChange,
          reason: "refund_approved",
          recorded_at: new Date(),
          current_stock: currentStock,
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        },
      });
      // Update order item status to refunded
      await tx.ecommerce_mall_order_items.update({
        where: { id: props.orderItemId },
        data: {
          status: "refunded",
          updated_at: new Date(),
        },
      });
      // Update parent order status if needed
      const orderItems = await tx.ecommerce_mall_order_items.findMany({
        where: {
          ecommerce_mall_order_id: orderItem.ecommerce_mall_order_id,
          deleted_at: null,
        },
        select: { status: true },
      });
      const allRefunded = orderItems.every(
        (item) => item.status === "refunded",
      );
      if (allRefunded) {
        await tx.ecommerce_mall_orders.update({
          where: { id: orderItem.ecommerce_mall_order_id },
          data: {
            status: "refunded",
            updated_at: new Date(),
          },
        });
      }
    }
    // Create snapshot for order item
    await tx.ecommerce_mall_order_item_snapshots.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        orderItem: {
          connect: { id: props.orderItemId },
        },
        snapshot_type: "refund",
        created_at: toISOStringSafe(new Date()),
        previous_values: JSON.stringify({
          id: refundRequest.id,
          reason: refundRequest.reason,
          status: refundRequest.status,
          requested_at: toISOStringSafe(refundRequest.requested_at),
          responded_at: refundRequest.responded_at
            ? toISOStringSafe(refundRequest.responded_at)
            : null,
          days_since_delivery: refundRequest.days_since_delivery,
        }),
        current_values: JSON.stringify({
          id: updatedRequest.id,
          reason: updatedRequest.reason,
          status: updatedRequest.status,
          requested_at: toISOStringSafe(updatedRequest.requested_at),
          responded_at: updatedRequest.responded_at
            ? toISOStringSafe(updatedRequest.responded_at)
            : null,
          days_since_delivery: updatedRequest.days_since_delivery,
        }),
      },
    });
    return updatedRequest;
  });
  // Transform and return
  const payload = await EcommerceMallOrderItemRefundRequestTransformer.select();
  const transformed =
    await MyGlobal.prisma.ecommerce_mall_order_item_refund_requests.findUniqueOrThrow(
      {
        where: { id: updated.id },
        ...payload,
      },
    );
  return await EcommerceMallOrderItemRefundRequestTransformer.transform(
    transformed,
  );
}
