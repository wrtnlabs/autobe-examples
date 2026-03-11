import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
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

export async function postShoppingMallSellerCancellationRequestsCancellationRequestIdReject(props: {
  seller: SellerPayload;
  cancellationRequestId: string;
}): Promise<IShoppingMallCancellationRequest> {
  // Fetch the cancellation request
  const cancellationRequest =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findUnique({
      where: { id: props.cancellationRequestId },
      select: {
        id: true,
        shopping_mall_order_item_id: true,
        reason: true,
        status: true,
      },
    });
  if (cancellationRequest === null) {
    throw new HttpException("Cancellation request not found", 404);
  }
  // Verify status is 'pending'
  if (cancellationRequest.status !== "pending") {
    throw new HttpException(
      "Cancellation request has already been resolved",
      409,
    );
  }
  // Fetch the order item with product relation to verify seller ownership
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findUnique({
    where: { id: cancellationRequest.shopping_mall_order_item_id },
    select: {
      id: true,
      product: {
        select: {
          shopping_mall_seller_id: true,
        },
      },
    },
  });
  if (orderItem === null) {
    throw new HttpException("Order item not found", 404);
  }
  // Verify the seller owns the product
  if (orderItem.product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException(
      "You are not authorized to respond to this cancellation request",
      403,
    );
  }
  // Check if seller is banned (suspended sellers CAN still reject per business rules)
  const sellerRecord = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id: props.seller.id },
    select: {
      banned: true,
    },
  });
  if (sellerRecord === null) {
    throw new HttpException("Seller not found", 404);
  }
  if (sellerRecord.banned) {
    throw new HttpException("Your account has been banned", 403);
  }
  const now = new Date();
  // Transaction: update cancellation request and create immutable snapshot
  const updated = await MyGlobal.prisma.$transaction(async (tx) => {
    // Update cancellation request with rejected status
    const updatedRequest = await tx.shopping_mall_cancellation_requests.update({
      where: { id: props.cancellationRequestId },
      data: {
        status: "rejected",
        shopping_mall_seller_id: props.seller.id,
        responded_at: now,
        updated_at: now,
      },
      ...ShoppingMallCancellationRequestTransformer.select(),
    });
    // Create immutable snapshot for audit trail
    await tx.shopping_mall_cancellation_request_snapshots.create({
      data: {
        id: v4(),
        shopping_mall_cancellation_request_id: props.cancellationRequestId,
        reason: cancellationRequest.reason,
        status: "rejected",
        created_at: now,
      },
    });
    return updatedRequest;
  });
  return await ShoppingMallCancellationRequestTransformer.transform(updated);
}
