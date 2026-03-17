import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { IShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImage";
import { IShoppingMallProductSnapshotSkus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSkus";
import { IShoppingMallProductSnapshotSkusOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSkusOption";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
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
  // 1. Load cancellation request with ownership chain for authorization
  const existing =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findUniqueOrThrow(
      {
        where: { id: props.cancellationRequestId },
        select: {
          id: true,
          status: true,
          reason: true,
          shopping_mall_order_item_id: true,
          orderItem: {
            select: {
              id: true,
              shopping_mall_order_id: true,
              productVariant: {
                select: {
                  product: {
                    select: {
                      shopping_mall_seller_id: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    );
  // 2. Seller ownership check
  if (
    existing.orderItem.productVariant.product.shopping_mall_seller_id !==
    props.seller.id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Validate status is 'pending'
  if (existing.status !== "pending") {
    throw new HttpException(
      "Cancellation request has already been resolved",
      409,
    );
  }
  const orderId = existing.orderItem.shopping_mall_order_id;
  const orderItemId = existing.shopping_mall_order_item_id;
  const now = new Date();
  // 4. Execute in a transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // a. Update cancellation request status
    await tx.shopping_mall_cancellation_requests.update({
      where: { id: props.cancellationRequestId },
      data: {
        status: props.body.status,
        updated_at: now,
      },
    });
    // b. If approved, cancel the order item
    if (props.body.status === "approved") {
      await tx.shopping_mall_order_items.update({
        where: { id: orderItemId },
        data: {
          status: "cancelled",
          updated_at: now,
        },
      });
    }
    // c. Create immutable snapshot
    await tx.shopping_mall_cancellation_request_snapshots.create({
      data: {
        id: v4(),
        cancellationRequest: { connect: { id: props.cancellationRequestId } },
        status: props.body.status,
        reason: existing.reason,
        created_at: now,
      },
    });
    // d. Recalculate and update parent order status
    const siblingItems = await tx.shopping_mall_order_items.findMany({
      where: { shopping_mall_order_id: orderId },
      select: { status: true },
    });
    const statuses = siblingItems.map((item) => item.status);
    const uniqueStatuses = new Set(statuses);
    const orderStatus: string =
      uniqueStatuses.size === 1
        ? (statuses[0] ?? "partially_completed")
        : "partially_completed";
    await tx.shopping_mall_orders.update({
      where: { id: orderId },
      data: {
        status: orderStatus,
        updated_at: now,
      },
    });
  });
  // 5. Re-fetch and return the updated cancellation request
  const updated =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findUniqueOrThrow(
      {
        where: { id: props.cancellationRequestId },
        ...ShoppingMallCancellationRequestTransformer.select(),
      },
    );
  return ShoppingMallCancellationRequestTransformer.transform(updated);
}
