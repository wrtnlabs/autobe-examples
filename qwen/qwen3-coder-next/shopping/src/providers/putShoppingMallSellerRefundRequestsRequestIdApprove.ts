import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallOrderProductSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderProductSnapshots";
import { IShoppingMallOrderRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderRefundRequest";
import { IShoppingMallOrderSellerProfileSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSellerProfileSnapshots";
import { IShoppingMallOrderVariantSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderVariantSnapshots";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallOrderRefundRequestTransformer } from "../transformers/ShoppingMallOrderRefundRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallSellerRefundRequestsRequestIdApprove(props: {
  seller: SellerPayload;
  requestId: string;
}): Promise<IShoppingMallOrderRefundRequest> {
  const refundRequest =
    await MyGlobal.prisma.shopping_mall_order_refund_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        include: {
          orderItem: {
            include: {
              order: {
                include: {
                  orderStatusLogs: true,
                },
              },
            },
          },
          customer: true,
          seller: true,
          customerSession: true,
          statusLogs: true,
          refundPayments: true,
        },
      },
    );
  if (refundRequest.status !== "pending") {
    throw new HttpException(
      `Refund request status is ${refundRequest.status}, not pending`,
      400,
    );
  }
  if (refundRequest.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden: You do not own this order item", 403);
  }
  const orderItem = refundRequest.orderItem;
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_refund_payments.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        refund_request_id: refundRequest.id,
        order_item_id: orderItem.id,
        customer_id: orderItem.order.shopping_mall_customer_id,
        seller_id: props.seller.id,
        transaction_id: v4(),
        refund_amount: orderItem.total_price,
        currency: "KRW",
        status: "completed",
        reconciled: false,
      },
    });
    await tx.shopping_mall_inventory_histories.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        shopping_mall_product_variant_id:
          orderItem.shopping_mall_order_variant_snapshot_id,
        reason: "refund",
        shopping_mall_order_item_id: orderItem.id,
        quantity_change: orderItem.quantity,
        created_at: new Date().toISOString(),
      },
    });
    await tx.shopping_mall_order_items.update({
      where: { id: orderItem.id },
      data: {
        item_status: "refunded" as const,
      },
    });
    await tx.shopping_mall_order_item_status_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        shopping_mall_order_item_id: orderItem.id,
        new_status: "refunded" as const,
        changed_by: "seller" as const,
        changed_by_id: props.seller.id,
      },
    });
    await tx.shopping_mall_order_refund_requests.update({
      where: { id: refundRequest.id },
      data: {
        status: "approved" as const,
      },
    });
    await tx.shopping_mall_order_refund_request_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        shopping_mall_order_refund_request_id: refundRequest.id,
        seller_id: props.seller.id,
        new_status: "approved" as const,
        old_status: "pending" as const,
        reason: "Seller approved refund request",
        changed_at: new Date().toISOString(),
      },
    });
    if (orderItem.item_status === "refunded") {
      await tx.shopping_mall_orders.update({
        where: { id: orderItem.shopping_mall_order_id },
        data: {
          status: "refunded" as const,
        },
      });
      await tx.shopping_mall_order_status_logs.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          shopping_mall_order_id: orderItem.shopping_mall_order_id,
          previous_status: orderItem.order.status,
          new_status: "refunded" as const,
          changed_by_id: props.seller.id,
          reason: "All order items refunded",
        },
      });
    }
  });
  const updatedRequest =
    await MyGlobal.prisma.shopping_mall_order_refund_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        include: {
          orderItem: {
            include: {
              order: {
                include: {
                  orderStatusLogs: true,
                },
              },
            },
          },
          customer: true,
          seller: true,
          customerSession: true,
          statusLogs: true,
          refundPayments: true,
        },
      },
    );
  return await ShoppingMallOrderRefundRequestTransformer.transform(
    updatedRequest,
  );
}
