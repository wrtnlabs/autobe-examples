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

export async function postShoppingMallSellerCancellationRequestsCancellationRequestIdApprove(props: {
  seller: SellerPayload;
  cancellationRequestId: string;
}): Promise<IShoppingMallCancellationRequest> {
  // Fetch cancellation request with relations to verify ownership
  const cancellationRequest =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findUnique({
      where: { id: props.cancellationRequestId },
      select: {
        id: true,
        reason: true,
        status: true,
        created_at: true,
        updated_at: true,
        responded_at: true,
        shopping_mall_order_item_id: true,
        orderItem: {
          select: {
            id: true,
            quantity: true,
            shopping_mall_product_variant_id: true,
            product: {
              select: {
                shopping_mall_seller_id: true,
              },
            },
          },
        },
      },
    });
  if (cancellationRequest === null) {
    throw new HttpException("Cancellation request not found", 404);
  }
  // Verify seller ownership
  if (
    cancellationRequest.orderItem.product.shopping_mall_seller_id !==
    props.seller.id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify status is pending
  if (cancellationRequest.status !== "pending") {
    throw new HttpException("Cancellation request already processed", 409);
  }
  const now = new Date();
  // Execute transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Update cancellation request
    await tx.shopping_mall_cancellation_requests.update({
      where: { id: props.cancellationRequestId },
      data: {
        status: "approved",
        shopping_mall_seller_id: props.seller.id,
        responded_at: now,
        updated_at: now,
      },
    });
    // Create snapshot
    await tx.shopping_mall_cancellation_request_snapshots.create({
      data: {
        id: v4(),
        shopping_mall_cancellation_request_id: props.cancellationRequestId,
        reason: cancellationRequest.reason,
        status: "approved",
        created_at: now,
      },
    });
    // Update order item status
    await tx.shopping_mall_order_items.update({
      where: { id: cancellationRequest.shopping_mall_order_item_id },
      data: {
        status: "cancelled",
        updated_at: now,
      },
    });
    // Create inventory record for stock restoration
    await tx.shopping_mall_inventory_records.create({
      data: {
        id: v4(),
        variant_id:
          cancellationRequest.orderItem.shopping_mall_product_variant_id,
        cancellation_request_id: props.cancellationRequestId,
        quantity_change: cancellationRequest.orderItem.quantity,
        reason: "Cancellation approved",
        created_at: now,
      },
    });
  });
  // Fetch and return updated cancellation request
  const result =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findUniqueOrThrow(
      {
        where: { id: props.cancellationRequestId },
        ...ShoppingMallCancellationRequestTransformer.select(),
      },
    );
  return ShoppingMallCancellationRequestTransformer.transform(result);
}
