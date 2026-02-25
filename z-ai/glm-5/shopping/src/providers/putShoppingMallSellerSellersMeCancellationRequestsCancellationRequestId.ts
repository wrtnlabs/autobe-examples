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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallCancellationRequestTransformer } from "../transformers/ShoppingMallCancellationRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallSellerSellersMeCancellationRequestsCancellationRequestId(props: {
  seller: SellerPayload;
  cancellationRequestId: string & tags.Format<"uuid">;
  body: IShoppingMallCancellationRequest.IUpdate;
}): Promise<IShoppingMallCancellationRequest> {
  // Query cancellation request with order item to verify seller ownership
  const cancellationRequest =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findUnique({
      where: { id: props.cancellationRequestId },
      select: {
        id: true,
        reason: true,
        status: true,
        seller_response: true,
        rejection_reason: true,
        created_at: true,
        updated_at: true,
        orderItem: {
          select: {
            id: true,
            shopping_mall_seller_id: true,
            shopping_mall_product_variant_id: true,
            quantity: true,
            status: true,
          },
        },
      },
    });
  if (cancellationRequest === null) {
    throw new HttpException("Cancellation request not found", 404);
  }
  // Verify seller ownership
  if (
    cancellationRequest.orderItem.shopping_mall_seller_id !== props.seller.id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate status is pending
  if (cancellationRequest.status !== "pending") {
    throw new HttpException(
      "Cancellation request is not in pending status",
      400,
    );
  }
  // If rejecting, validate rejection reason provided
  if (props.body.status === "rejected" && !props.body.rejectionReason) {
    throw new HttpException("Rejection reason is required when rejecting", 400);
  }
  const now = new Date();
  // Update cancellation request
  const updatedRequest =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.update({
      where: { id: props.cancellationRequestId },
      data: {
        status: props.body.status,
        seller_response: props.body.sellerResponse ?? null,
        rejection_reason:
          props.body.status === "rejected"
            ? (props.body.rejectionReason ?? null)
            : null,
        updated_at: now,
      },
      ...ShoppingMallCancellationRequestTransformer.select(),
    });
  // If approved, cancel order item and restore inventory
  if (props.body.status === "approved") {
    // Update order item status to cancelled
    await MyGlobal.prisma.shopping_mall_order_items.update({
      where: { id: cancellationRequest.orderItem.id },
      data: {
        status: "cancelled",
      },
    });
    // Restore inventory if variant exists
    if (
      cancellationRequest.orderItem.shopping_mall_product_variant_id !== null
    ) {
      await MyGlobal.prisma.shopping_mall_product_inventory_histories.create({
        data: {
          id: v4(),
          shopping_mall_product_variant_id:
            cancellationRequest.orderItem.shopping_mall_product_variant_id,
          quantity_change: cancellationRequest.orderItem.quantity,
          reason: "cancellation",
          created_at: now,
        },
      });
    }
  }
  // Create snapshot for audit trail
  await MyGlobal.prisma.shopping_mall_cancellation_request_snapshots.create({
    data: {
      id: v4(),
      shopping_mall_cancellation_request_id: props.cancellationRequestId,
      previous_status: "pending",
      new_status: props.body.status,
      reason: cancellationRequest.reason,
      seller_response: props.body.sellerResponse ?? null,
      rejection_reason:
        props.body.status === "rejected"
          ? (props.body.rejectionReason ?? null)
          : null,
      created_at: now,
    },
  });
  return await ShoppingMallCancellationRequestTransformer.transform(
    updatedRequest,
  );
}
