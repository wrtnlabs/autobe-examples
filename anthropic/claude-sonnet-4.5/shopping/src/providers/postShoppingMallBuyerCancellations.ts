import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellation";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

export async function postShoppingMallBuyerCancellations(props: {
  buyer: BuyerPayload;
  body: IShoppingMallOrderCancellation.ICreate;
}): Promise<IShoppingMallOrderCancellation> {
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: props.body.shopping_mall_order_id },
  });

  if (!order) {
    throw new HttpException("Order not found", 404);
  }

  if (order.shopping_mall_buyer_id !== props.buyer.id) {
    throw new HttpException("Forbidden", 403);
  }

  if (props.body.shopping_mall_order_seller_id) {
    const orderSeller =
      await MyGlobal.prisma.shopping_mall_order_sellers.findUnique({
        where: { id: props.body.shopping_mall_order_seller_id },
      });

    if (!orderSeller) {
      throw new HttpException("Order seller sub-order not found", 404);
    }

    if (
      orderSeller.shopping_mall_order_id !== props.body.shopping_mall_order_id
    ) {
      throw new HttpException(
        "Seller sub-order does not belong to the specified order",
        400,
      );
    }
  }

  const now = new Date();
  const cancellation =
    await MyGlobal.prisma.shopping_mall_order_cancellations.create({
      data: {
        id: v4(),
        shopping_mall_order_id: props.body.shopping_mall_order_id,
        shopping_mall_order_seller_id:
          props.body.shopping_mall_order_seller_id ?? null,
        requested_by_buyer_id: props.buyer.id,
        requested_by_seller_id: null,
        requested_by_admin_id: null,
        approved_by_seller_id: null,
        approved_by_admin_id: null,
        cancellation_reason: props.body.cancellation_reason,
        cancellation_explanation: props.body.cancellation_explanation ?? null,
        approval_status: "pending",
        refund_amount: null,
        requested_at: now,
        approved_at: null,
        denied_at: null,
        completed_at: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  return {
    id: cancellation.id,
    shopping_mall_order_id: cancellation.shopping_mall_order_id,
    shopping_mall_order_seller_id:
      cancellation.shopping_mall_order_seller_id ?? undefined,
    requested_by_buyer_id: cancellation.requested_by_buyer_id ?? undefined,
    requested_by_seller_id: cancellation.requested_by_seller_id ?? undefined,
    requested_by_admin_id: cancellation.requested_by_admin_id ?? undefined,
    approved_by_seller_id: cancellation.approved_by_seller_id ?? undefined,
    approved_by_admin_id: cancellation.approved_by_admin_id ?? undefined,
    cancellation_reason: cancellation.cancellation_reason,
    cancellation_explanation:
      cancellation.cancellation_explanation ?? undefined,
    approval_status: typia.assert<
      | "pending"
      | "expired"
      | "auto_approved"
      | "seller_approved"
      | "admin_approved"
      | "denied"
    >(cancellation.approval_status),
    refund_amount: cancellation.refund_amount ?? undefined,
    requested_at: toISOStringSafe(cancellation.requested_at),
    approved_at: cancellation.approved_at
      ? toISOStringSafe(cancellation.approved_at)
      : null,
    denied_at: cancellation.denied_at
      ? toISOStringSafe(cancellation.denied_at)
      : null,
    completed_at: cancellation.completed_at
      ? toISOStringSafe(cancellation.completed_at)
      : null,
    created_at: toISOStringSafe(cancellation.created_at),
    updated_at: toISOStringSafe(cancellation.updated_at),
    deleted_at: null,
  };
}
