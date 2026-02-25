import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellationRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallOrderCancellationRequestTransformer } from "../transformers/ShoppingMallOrderCancellationRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallSellerCancellationRequestsRequestIdApprove(props: {
  seller: SellerPayload;
  requestId: string;
}): Promise<IShoppingMallOrderCancellationRequest> {
  // Step 1: Retrieve cancellation request with full relations
  const request =
    await MyGlobal.prisma.shopping_mall_order_cancellation_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        select: {
          id: true,
          order_item_id: true,
          customer_id: true,
          reason: true,
          status: true,
          rejection_reason: true,
          responded_by: true,
          created_at: true,
          responded_at: true,
          orderItem: {
            select: {
              id: true,
              quantity: true,
              shopping_mall_order_variant_snapshot_id: true,
              shopping_mall_order_seller_profile_snapshot_id: true,
            },
          },
        },
      },
    );
  // Step 2: Validate request status is "pending"
  if (request.status !== "pending") {
    throw new HttpException("Cancellation request is not pending", 400);
  }
  // Step 3: Verify seller owns the product through order item
  const orderItem = request.orderItem;
  if (!orderItem) {
    throw new HttpException("Order item not found", 404);
  }
  const sellerProfileSnapshot =
    await MyGlobal.prisma.shopping_mall_order_seller_profile_snapshots.findUniqueOrThrow(
      {
        where: { id: orderItem.shopping_mall_order_seller_profile_snapshot_id },
        select: {
          id: true,
        },
      },
    );
  if (sellerProfileSnapshot.id !== props.seller.id) {
    throw new HttpException("Forbidden: You do not own this product", 403);
  }
  // Step 4: Create cancellation request log
  await MyGlobal.prisma.shopping_mall_order_cancellation_request_logs.create({
    data: {
      id: v4(),
      shopping_mall_order_cancellation_request_id: props.requestId,
      responded_by: props.seller.id,
      from_status: "pending",
      to_status: "approved",
      created_at: toISOStringSafe(new Date()),
    },
  });
  // Step 5: Update cancellation request status
  const updatedRequest =
    await MyGlobal.prisma.shopping_mall_order_cancellation_requests.update({
      where: { id: props.requestId },
      data: {
        status: "approved",
        responded_by: props.seller.id,
        responded_at: toISOStringSafe(new Date()),
      },
      select: {
        id: true,
        order_item_id: true,
        customer_id: true,
        reason: true,
        status: true,
        rejection_reason: true,
        responded_by: true,
        created_at: true,
        responded_at: true,
        orderItem: {
          select: {
            id: true,
            quantity: true,
            shopping_mall_order_variant_snapshot_id: true,
          },
        },
      },
    });
  // Step 6: Restore stock quantity for the variant
  const variantSnapshot =
    await MyGlobal.prisma.shopping_mall_order_variant_snapshots.findUniqueOrThrow(
      {
        where: {
          id: updatedRequest.orderItem.shopping_mall_order_variant_snapshot_id,
        },
        select: {
          id: true,
          shopping_mall_product_variant_id: true,
        },
      },
    );
  await MyGlobal.prisma.shopping_mall_inventory_histories.create({
    data: {
      id: v4(),
      shopping_mall_product_variant_id:
        variantSnapshot.shopping_mall_product_variant_id,
      shopping_mall_order_item_id: updatedRequest.order_item_id,
      quantity_change: updatedRequest.orderItem.quantity,
      reason: "order_cancellation",
      created_at: toISOStringSafe(new Date()),
    },
  });
  // Step 7: Update order item status to cancelled
  await MyGlobal.prisma.shopping_mall_order_items.update({
    where: { id: updatedRequest.order_item_id },
    data: {
      item_status: "cancelled",
    },
  });
  // Step 8: Create refund request
  await MyGlobal.prisma.shopping_mall_order_refund_requests.create({
    data: {
      id: v4(),
      shopping_mall_order_item_id: updatedRequest.order_item_id,
      customer_id: updatedRequest.customer_id,
      seller_id: props.seller.id,
      customer_session_id: v4(),
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      reason: "Cancellation approved by seller",
      status: "approved",
    },
  });
  // Step 9: Return the updated cancellation request with full details
  return await ShoppingMallOrderCancellationRequestTransformer.transform(
    await MyGlobal.prisma.shopping_mall_order_cancellation_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        ...ShoppingMallOrderCancellationRequestTransformer.select(),
      },
    ),
  );
}
