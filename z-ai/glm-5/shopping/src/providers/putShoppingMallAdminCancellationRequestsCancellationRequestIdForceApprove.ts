import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallOrderItemVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantOption";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallCancellationRequestTransformer } from "../transformers/ShoppingMallCancellationRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallAdminCancellationRequestsCancellationRequestIdForceApprove(props: {
  admin: AdminPayload;
  cancellationRequestId: string & tags.Format<"uuid">;
  body: IShoppingMallCancellationRequest.IForceApprove;
}): Promise<IShoppingMallCancellationRequest> {
  // Fetch cancellation request
  const cancellationRequest =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findUnique({
      where: { id: props.cancellationRequestId },
      select: {
        id: true,
        order_item_id: true,
        reason: true,
        status: true,
      },
    });
  if (!cancellationRequest) {
    throw new HttpException("Cancellation request not found", 404);
  }
  if (cancellationRequest.status !== "pending") {
    throw new HttpException("Cancellation request is already processed", 400);
  }
  // Fetch order item
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findUnique({
    where: { id: cancellationRequest.order_item_id },
    select: {
      id: true,
      shopping_mall_order_id: true,
      shopping_mall_product_variant_id: true,
      quantity: true,
      status: true,
    },
  });
  if (!orderItem) {
    throw new HttpException("Order item not found", 404);
  }
  if (orderItem.status !== "paid") {
    throw new HttpException("Order item is not eligible for cancellation", 400);
  }
  const sellerResponse = props.body.note ?? "Force approved by administrator";
  const now = new Date();
  // Execute transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Fetch order for order number
    const order = await tx.shopping_mall_orders.findUniqueOrThrow({
      where: { id: orderItem.shopping_mall_order_id },
      select: { order_number: true },
    });
    // Create snapshot
    await tx.shopping_mall_cancellation_request_snapshots.create({
      data: {
        id: v4(),
        shopping_mall_cancellation_request_id: cancellationRequest.id,
        previous_status: "pending",
        new_status: "approved",
        reason: cancellationRequest.reason,
        seller_response: sellerResponse,
        created_at: now,
      },
    });
    // Update cancellation request
    await tx.shopping_mall_cancellation_requests.update({
      where: { id: cancellationRequest.id },
      data: {
        status: "approved",
        seller_response: sellerResponse,
        updated_at: now,
      },
    });
    // Update order item status
    await tx.shopping_mall_order_items.update({
      where: { id: orderItem.id },
      data: {
        status: "cancelled",
      },
    });
    // Create inventory restoration record
    if (orderItem.shopping_mall_product_variant_id) {
      await tx.shopping_mall_product_inventory_histories.create({
        data: {
          id: v4(),
          shopping_mall_product_variant_id:
            orderItem.shopping_mall_product_variant_id,
          quantity_change: orderItem.quantity,
          reason: `Cancellation force-approved by administrator - ${order.order_number}`,
          created_at: now,
        },
      });
    }
    // Update order derived status
    const orderItems = await tx.shopping_mall_order_items.findMany({
      where: { shopping_mall_order_id: orderItem.shopping_mall_order_id },
      select: { status: true },
    });
    const allCancelled = orderItems.every(
      (item) => item.status === "cancelled",
    );
    const derivedStatus = allCancelled ? "cancelled" : "partially_completed";
    await tx.shopping_mall_orders.update({
      where: { id: orderItem.shopping_mall_order_id },
      data: {
        status: derivedStatus,
        updated_at: now,
      },
    });
  });
  // Fetch and return updated cancellation request with transformer
  const updated =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findUniqueOrThrow(
      {
        where: { id: props.cancellationRequestId },
        ...ShoppingMallCancellationRequestTransformer.select(),
      },
    );
  return await ShoppingMallCancellationRequestTransformer.transform(updated);
}
