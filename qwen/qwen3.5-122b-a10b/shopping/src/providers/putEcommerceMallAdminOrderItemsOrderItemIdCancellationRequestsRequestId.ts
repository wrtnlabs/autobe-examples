import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallOrderItemCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemCancellationRequest";
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
import { EcommerceMallOrderItemCancellationRequestTransformer } from "../transformers/EcommerceMallOrderItemCancellationRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallAdminOrderItemsOrderItemIdCancellationRequestsRequestId(props: {
  admin: AdminPayload;
  orderItemId: string & tags.Format<"uuid">;
  requestId: string & tags.Format<"uuid">;
  body: IEcommerceMallOrderItemCancellationRequest.IUpdate;
}): Promise<IEcommerceMallOrderItemCancellationRequest> {
  // 1. Load and verify cancellation request
  const cancellationRequest =
    await MyGlobal.prisma.ecommerce_mall_order_item_cancellation_requests.findUnique(
      {
        where: { id: props.requestId },
        select: {
          id: true,
          order_item_id: true,
          status: true,
          reason: true,
          requested_at: true,
          responded_at: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    );
  if (cancellationRequest === null) {
    throw new HttpException("Cancellation request not found", 404);
  }
  // Verify orderItemId matches
  if (cancellationRequest.order_item_id !== props.orderItemId) {
    throw new HttpException("Order item ID mismatch", 400);
  }
  // 2. Validate status is pending
  if (cancellationRequest.status !== "pending") {
    throw new HttpException(
      "Cancellation request is not in pending status",
      400,
    );
  }
  // 3. Load order item to verify status and get details
  const orderItem = await MyGlobal.prisma.ecommerce_mall_order_items.findUnique(
    {
      where: { id: props.orderItemId },
      select: {
        id: true,
        status: true,
        quantity: true,
        unit_price: true,
        ecommerce_mall_order_id: true,
        ecommerce_mall_product_variant_id: true,
      },
    },
  );
  if (orderItem === null) {
    throw new HttpException("Order item not found", 404);
  }
  // Verify order item status is paid
  if (orderItem.status !== "paid") {
    throw new HttpException("Order item is not in paid status", 400);
  }
  // 4. Validate body status
  const newStatus = typia.assert<"approved" | "rejected">(props.body.status);
  // 5. Execute business logic in transaction
  const now = new Date();
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Update cancellation request
    await tx.ecommerce_mall_order_item_cancellation_requests.update({
      where: { id: props.requestId },
      data: {
        status: newStatus,
        responded_at: now,
        updated_at: now,
      },
    });
    // If approved, cancel order item and restore stock
    if (newStatus === "approved") {
      // Update order item status to cancelled
      await tx.ecommerce_mall_order_items.update({
        where: { id: props.orderItemId },
        data: {
          status: "cancelled",
          updated_at: now,
        },
      });
      // Create inventory record for stock restoration
      const currentVariant =
        await tx.ecommerce_mall_product_variants.findUnique({
          where: { id: orderItem.ecommerce_mall_product_variant_id },
          select: { stock_quantity: true },
        });
      const newStockQuantity =
        (currentVariant?.stock_quantity ?? 0) + orderItem.quantity;
      await tx.ecommerce_mall_inventory_records.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          ecommerce_mall_product_variant_id:
            orderItem.ecommerce_mall_product_variant_id,
          quantity_change: orderItem.quantity,
          reason: "cancellation_approved",
          recorded_at: now,
          current_stock: newStockQuantity,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      });
      // Update variant stock quantity
      await tx.ecommerce_mall_product_variants.update({
        where: { id: orderItem.ecommerce_mall_product_variant_id },
        data: {
          stock_quantity: newStockQuantity,
          updated_at: now,
        },
      });
      // Check and update order status if all items are cancelled
      const orderItems = await tx.ecommerce_mall_order_items.findMany({
        where: {
          ecommerce_mall_order_id: orderItem.ecommerce_mall_order_id,
          deleted_at: null,
        },
        select: { status: true },
      });
      const allCancelled = orderItems.every(
        (item) => item.status === "cancelled",
      );
      if (allCancelled) {
        await tx.ecommerce_mall_orders.update({
          where: { id: orderItem.ecommerce_mall_order_id },
          data: {
            status: "cancelled",
            updated_at: now,
          },
        });
      }
    }
    // Create snapshot
    await tx.ecommerce_mall_order_item_snapshots.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        order_item_id: props.orderItemId,
        changed_by_id: props.admin.id,
        snapshot_type: "cancellation",
        created_at: now,
        previous_values: JSON.stringify({
          status: cancellationRequest.status,
          reason: cancellationRequest.reason,
          requested_at: toISOStringSafe(cancellationRequest.requested_at),
          responded_at: cancellationRequest.responded_at
            ? toISOStringSafe(cancellationRequest.responded_at)
            : null,
        }),
        current_values: JSON.stringify({
          status: newStatus,
          reason: cancellationRequest.reason,
          requested_at: toISOStringSafe(cancellationRequest.requested_at),
          responded_at: toISOStringSafe(now),
        }),
      },
    });
  });
  // 6. Load and return updated cancellation request
  const updated =
    await MyGlobal.prisma.ecommerce_mall_order_item_cancellation_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        ...EcommerceMallOrderItemCancellationRequestTransformer.select(),
      },
    );
  return await EcommerceMallOrderItemCancellationRequestTransformer.transform(
    updated,
  );
}
