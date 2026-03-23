import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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

export async function putShoppingMallSellerCancellationRequestsCancellationRequestId(props: {
  seller: SellerPayload;
  cancellationRequestId: string & tags.Format<"uuid">;
  body: IShoppingMallCancellationRequest.IUpdate;
}): Promise<IShoppingMallCancellationRequest> {
  // Step 1: Find cancellation request (not soft-deleted)
  const cancellationRequest =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findUniqueOrThrow(
      {
        where: {
          id: props.cancellationRequestId,
          deleted_at: null,
        },
        select: {
          id: true,
          shopping_mall_order_item_id: true,
          status: true,
        },
      },
    );
  // Step 2: Verify seller owns the product (via order_item)
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: {
        id: cancellationRequest.shopping_mall_order_item_id,
        deleted_at: null,
      },
      select: {
        id: true,
        shopping_mall_seller_id: true,
      },
    });
  if (orderItem.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Verify status is 'pending'
  if (cancellationRequest.status !== "pending") {
    throw new HttpException("Cancellation request already responded to", 409);
  }
  // Step 4: Validate rejection_reason when status is 'rejected'
  if (props.body.status === "rejected" && !props.body.rejection_reason) {
    throw new HttpException(
      "Rejection reason is required when rejecting cancellation",
      400,
    );
  }
  const now = new Date();
  // Step 5: Transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Get full cancellation request for snapshot
    const fullRequest =
      await tx.shopping_mall_cancellation_requests.findUniqueOrThrow({
        where: { id: props.cancellationRequestId },
        ...ShoppingMallCancellationRequestTransformer.select(),
      });
    // Create snapshot
    await tx.shopping_mall_cancellation_snapshots.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        shopping_mall_cancellation_request_id: props.cancellationRequestId,
        snapshot_data: JSON.stringify({
          previous_status: fullRequest.status,
          new_status: props.body.status,
          rejection_reason: props.body.rejection_reason ?? null,
          responded_at: now.toISOString(),
          seller_id: props.seller.id,
        }),
        created_at: now,
      },
    });
    // Update cancellation request
    await tx.shopping_mall_cancellation_requests.update({
      where: { id: props.cancellationRequestId },
      data: {
        status: props.body.status,
        rejection_reason: props.body.rejection_reason ?? null,
        responded_at: now,
        shopping_mall_seller_id: props.seller.id,
        updated_at: now,
      },
    });
    // If approved, update order item status to 'cancelled'
    if (props.body.status === "approved") {
      await tx.shopping_mall_order_items.update({
        where: { id: orderItem.id },
        data: {
          status: "cancelled",
          updated_at: now,
        },
      });
    }
  });
  // Step 6: Return updated cancellation request
  const updated =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findUniqueOrThrow(
      {
        where: { id: props.cancellationRequestId },
        ...ShoppingMallCancellationRequestTransformer.select(),
      },
    );
  return await ShoppingMallCancellationRequestTransformer.transform(updated);
}
