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

export async function putShoppingMallSellerCancellationRequestsCancellationRequestIdReject(props: {
  seller: SellerPayload;
  cancellationRequestId: string;
  body: IShoppingMallCancellationRequest.IReject;
}): Promise<IShoppingMallCancellationRequest> {
  // Fetch cancellation request with order item to verify seller ownership
  const cancellationRequest =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findUnique({
      where: { id: props.cancellationRequestId },
      select: {
        id: true,
        order_item_id: true,
        customer_id: true,
        reason: true,
        status: true,
        seller_response: true,
        rejection_reason: true,
        created_at: true,
        updated_at: true,
        orderItem: {
          select: {
            shopping_mall_seller_id: true,
          },
        },
      },
    });
  if (cancellationRequest === null) {
    throw new HttpException("Cancellation request not found", 404);
  }
  // Validate seller owns this order item
  if (
    cancellationRequest.orderItem.shopping_mall_seller_id !== props.seller.id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate status is pending
  if (cancellationRequest.status !== "pending") {
    throw new HttpException(
      `Cancellation request already ${cancellationRequest.status}`,
      400,
    );
  }
  // Validate rejection reason is provided
  if (
    props.body.rejectionReason === null ||
    props.body.rejectionReason === undefined
  ) {
    throw new HttpException("Rejection reason is required", 400);
  }
  const now = new Date();
  // Transaction: update request and create snapshot
  const updated = await MyGlobal.prisma.$transaction(async (tx) => {
    // Update cancellation request
    const updatedRequest = await tx.shopping_mall_cancellation_requests.update({
      where: { id: props.cancellationRequestId },
      data: {
        status: "rejected",
        rejection_reason: props.body.rejectionReason,
        seller_response: props.body.sellerResponse ?? null,
        updated_at: now,
      },
      ...ShoppingMallCancellationRequestTransformer.select(),
    });
    // Create snapshot for audit trail
    await tx.shopping_mall_cancellation_request_snapshots.create({
      data: {
        id: v4(),
        shopping_mall_cancellation_request_id: props.cancellationRequestId,
        previous_status: "pending",
        new_status: "rejected",
        reason: cancellationRequest.reason,
        seller_response: props.body.sellerResponse ?? null,
        rejection_reason: props.body.rejectionReason,
        created_at: now,
      },
    });
    return updatedRequest;
  });
  return await ShoppingMallCancellationRequestTransformer.transform(updated);
}
