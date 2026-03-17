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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallOrderItemCancellationRequestTransformer } from "../transformers/EcommerceMallOrderItemCancellationRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallSellerOrderItemsOrderItemIdCancellationRequestsRequestId(props: {
  seller: SellerPayload;
  orderItemId: string & tags.Format<"uuid">;
  requestId: string & tags.Format<"uuid">;
  body: IEcommerceMallOrderItemCancellationRequest.IUpdate;
}): Promise<IEcommerceMallOrderItemCancellationRequest> {
  // Load cancellation request
  const request =
    await MyGlobal.prisma.ecommerce_mall_order_item_cancellation_requests.findUniqueOrThrow(
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
  // Verify order_item_id matches
  if (request.order_item_id !== props.orderItemId) {
    throw new HttpException("Order item mismatch", 400);
  }
  // Load order item with product variant and product
  const orderItem =
    await MyGlobal.prisma.ecommerce_mall_order_items.findUniqueOrThrow({
      where: { id: props.orderItemId },
      select: {
        id: true,
        status: true,
        quantity: true,
        productVariant: {
          select: {
            id: true,
            stock_quantity: true,
            product: {
              select: {
                seller: {
                  select: {
                    id: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  // Verify seller owns the product
  if (orderItem.productVariant.product.seller.id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify cancellation request is pending
  if (request.status !== "pending") {
    throw new HttpException("Cancellation request is not pending", 400);
  }
  // Verify order item is in paid status
  if (orderItem.status !== "paid") {
    throw new HttpException("Order item is not in paid status", 400);
  }
  // Get the new status from body
  const newStatus = typia.assert<"approved" | "rejected">(props.body.status);
  // Perform update in transaction
  const now = new Date();
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    // Update cancellation request
    const updatedRequest =
      await tx.ecommerce_mall_order_item_cancellation_requests.update({
        where: { id: props.requestId },
        data: {
          status: newStatus,
          responded_at: now,
          updated_at: now,
        },
      });
    // If approved, update order item and create inventory record
    if (newStatus === "approved") {
      // Update order item to cancelled
      await tx.ecommerce_mall_order_items.update({
        where: { id: props.orderItemId },
        data: {
          status: "cancelled",
          updated_at: now,
        },
      });
      // Calculate new stock quantity (previous stock + quantity_change)
      const newStockQuantity =
        orderItem.productVariant.stock_quantity + orderItem.quantity;
      // Create inventory record for stock restoration
      await tx.ecommerce_mall_inventory_records.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          ecommerce_mall_product_variant_id: orderItem.productVariant.id,
          quantity_change: orderItem.quantity,
          reason: "cancellation_approved",
          recorded_at: now,
          current_stock: newStockQuantity,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      });
      // Update product variant stock quantity
      await tx.ecommerce_mall_product_variants.update({
        where: { id: orderItem.productVariant.id },
        data: {
          stock_quantity: newStockQuantity,
          updated_at: now,
        },
      });
    }
    // Create snapshot
    await tx.ecommerce_mall_order_item_snapshots.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        order_item_id: props.orderItemId,
        changed_by_id: props.seller.id,
        snapshot_type: "cancellation",
        created_at: now,
        previous_values: JSON.stringify({
          status: request.status,
          reason: request.reason,
          requested_at: toISOStringSafe(request.requested_at),
          responded_at: request.responded_at
            ? toISOStringSafe(request.responded_at)
            : null,
        }),
        current_values: JSON.stringify({
          status: newStatus,
          reason: request.reason,
          requested_at: toISOStringSafe(request.requested_at),
          responded_at: toISOStringSafe(now),
        }),
      },
    });
    return updatedRequest;
  });
  // Load and transform the updated request
  const fullRequest =
    await MyGlobal.prisma.ecommerce_mall_order_item_cancellation_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        ...EcommerceMallOrderItemCancellationRequestTransformer.select(),
      },
    );
  return await EcommerceMallOrderItemCancellationRequestTransformer.transform(
    fullRequest,
  );
}
