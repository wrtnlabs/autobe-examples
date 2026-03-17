import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { IShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImage";
import { IShoppingMallProductSnapshotSkus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSkus";
import { IShoppingMallProductSnapshotSkusOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSkusOption";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
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
import { ShoppingMallRefundRequestTransformer } from "../transformers/ShoppingMallRefundRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallSellerRefundRequestsRefundRequestId(props: {
  seller: SellerPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IShoppingMallRefundRequest.IUpdate;
}): Promise<IShoppingMallRefundRequest> {
  // Step 1: Load the refund request with auth context data
  const existing =
    await MyGlobal.prisma.shopping_mall_refund_requests.findUniqueOrThrow({
      where: { id: props.refundRequestId },
      select: {
        id: true,
        status: true,
        orderItem: {
          select: {
            id: true,
            shopping_mall_order_id: true,
            shopping_mall_product_variant_id: true,
            quantity: true,
            productVariant: {
              select: {
                id: true,
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
    });
  // Step 2: Authorization — seller must own the product variant
  if (
    existing.orderItem.productVariant.product.shopping_mall_seller_id !==
    props.seller.id
  ) {
    throw new HttpException(
      "Forbidden: you do not own this refund request's product",
      403,
    );
  }
  // Step 3: Validate status is 'pending'
  if (existing.status !== "pending") {
    throw new HttpException(
      "Unprocessable: the refund request has already been resolved",
      422,
    );
  }
  const now = new Date();
  // Step 4: Execute transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // 4a. Update refund request status
    await tx.shopping_mall_refund_requests.update({
      where: { id: props.refundRequestId },
      data: {
        status: props.body.status,
        updated_at: now,
      },
    });
    // 4b. Insert snapshot (append-only audit trail)
    await tx.shopping_mall_refund_request_snapshots.create({
      data: {
        id: v4(),
        refundRequest: { connect: { id: props.refundRequestId } },
        created_at: now,
      },
    });
    if (props.body.status === "approved") {
      // 4c. Update order item to 'refunded'
      await tx.shopping_mall_order_items.update({
        where: { id: existing.orderItem.id },
        data: {
          status: "refunded",
          updated_at: now,
        },
      });
      // 4c. Restore inventory with positive quantity adjustment
      await tx.shopping_mall_inventory_records.create({
        data: {
          id: v4(),
          productVariant: {
            connect: {
              id: existing.orderItem.shopping_mall_product_variant_id,
            },
          },
          quantity: existing.orderItem.quantity,
          reason_type: "order_refund",
          note: null,
          created_at: now,
        },
      });
      // 4c. Recalculate and update derived order status
      const allOrderItems = await tx.shopping_mall_order_items.findMany({
        where: {
          shopping_mall_order_id: existing.orderItem.shopping_mall_order_id,
        },
        select: { id: true, status: true },
      });
      const updatedItems = allOrderItems.map((item) =>
        item.id === existing.orderItem.id
          ? { ...item, status: "refunded" }
          : item,
      );
      const uniqueStatuses = [...new Set(updatedItems.map((i) => i.status))];
      const derivedOrderStatus =
        uniqueStatuses.length === 1 && uniqueStatuses[0] !== undefined
          ? uniqueStatuses[0]
          : "partially_completed";
      await tx.shopping_mall_orders.update({
        where: { id: existing.orderItem.shopping_mall_order_id },
        data: {
          status: derivedOrderStatus,
          updated_at: now,
        },
      });
    }
  });
  // Step 5: Re-fetch and return the fully updated refund request using transformer
  const updated =
    await MyGlobal.prisma.shopping_mall_refund_requests.findUniqueOrThrow({
      where: { id: props.refundRequestId },
      ...ShoppingMallRefundRequestTransformer.select(),
    });
  return ShoppingMallRefundRequestTransformer.transform(updated);
}
