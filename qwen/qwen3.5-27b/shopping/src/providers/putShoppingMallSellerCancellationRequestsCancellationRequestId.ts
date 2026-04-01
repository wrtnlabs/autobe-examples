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
  // Step 1: Find the cancellation request and verify it exists and is not soft-deleted
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
  // Step 2: Verify the status is 'pending' - only pending requests can be updated
  if (cancellationRequest.status !== "pending") {
    throw new HttpException(
      "Cancellation request has already been responded to",
      409,
    );
  }
  // Step 3: Verify the seller owns the product in the order item
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: {
        id: cancellationRequest.shopping_mall_order_item_id,
      },
      select: {
        id: true,
        shopping_mall_seller_id: true,
      },
    });
  if (orderItem.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 4: Validate rejection_reason if status is 'rejected'
  if (props.body.status === "rejected" && !props.body.rejection_reason) {
    throw new HttpException(
      "Rejection reason is required when rejecting a cancellation request",
      400,
    );
  }
  // Step 5: Begin database transaction
  const now = new Date();
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    // Step 5a: Create snapshot in shopping_mall_cancellation_snapshots
    await tx.shopping_mall_cancellation_snapshots.create({
      data: {
        id: v4(),
        shopping_mall_cancellation_request_id: props.cancellationRequestId,
        snapshot_data: JSON.stringify({
          previous_status: "pending",
          new_status: props.body.status,
          rejection_reason: props.body.rejection_reason ?? null,
          responded_at: now.toISOString(),
          seller_id: props.seller.id,
        }),
        created_at: now,
      },
    });
    // Step 5b: Update the cancellation request
    await tx.shopping_mall_cancellation_requests.update({
      where: {
        id: props.cancellationRequestId,
      },
      data: {
        status: props.body.status,
        rejection_reason:
          props.body.status === "rejected" ? props.body.rejection_reason : null,
        responded_at: now,
        shopping_mall_seller_id: props.seller.id,
        updated_at: now,
      },
    });
    // Step 5c: If approved, update order item status to 'cancelled'
    if (props.body.status === "approved") {
      await tx.shopping_mall_order_items.update({
        where: {
          id: orderItem.id,
        },
        data: {
          status: "cancelled",
        },
      });
    }
    // Step 6: Return the updated cancellation request with full data
    return tx.shopping_mall_cancellation_requests.findUniqueOrThrow({
      where: {
        id: props.cancellationRequestId,
      },
      ...ShoppingMallCancellationRequestTransformer.select(),
    });
  });
  // Step 7: Transform and return the result
  return await ShoppingMallCancellationRequestTransformer.transform(result);
}
