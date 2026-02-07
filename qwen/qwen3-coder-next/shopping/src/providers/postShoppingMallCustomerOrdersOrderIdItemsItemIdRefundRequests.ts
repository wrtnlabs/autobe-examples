import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerOrdersOrderIdItemsItemIdRefundRequests(props: {
  customer: CustomerPayload;
  orderId: string;
  itemId: string;
  body: IShoppingMallRefundRequest.ICreate;
}): Promise<IShoppingMallRefundRequest> {
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findUnique({
    where: {
      id: props.itemId,
      shopping_mall_order_id: props.orderId,
    },
  });
  if (!orderItem) {
    throw new HttpException("Order item not found", 404);
  }
  if (orderItem.seller_profile_snapshot_id !== props.customer.id) {
    throw new HttpException("Forbidden: You do not own this order item", 403);
  }
  if (orderItem.status !== "shipped" && orderItem.status !== "delivered") {
    throw new HttpException(
      "Order item must be shipped or delivered for refund",
      400,
    );
  }
  const existingRefund =
    await MyGlobal.prisma.shopping_mall_refund_requests.findFirst({
      where: {
        shopping_mall_order_item_id: props.itemId,
        deleted_at: null,
      },
    });
  if (existingRefund) {
    throw new HttpException(
      "Refund request already exists for this order item",
      400,
    );
  }
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.shopping_mall_refund_requests.create({
    data: {
      id: v4(),
      shopping_mall_order_item_id: props.itemId,
      shopping_mall_customer_id: props.customer.id,
      shopping_mall_customer_session_id: props.customer.session_id,
      shopping_mall_seller_id: orderItem.seller_profile_snapshot_id,
      customer_reason: (props.body as any).customer_reason ?? "",
      requested_refund_amount: (props.body as any).requested_refund_amount ?? 0,
      status: "pending",
      created_at: now,
      updated_at: now,
      resolved_at: null,
      deleted_at: null,
    },
  });
  const createdAt: string & tags.Format<"date-time"> = toISOStringSafe(
    created.created_at,
  );
  const updatedAt: string & tags.Format<"date-time"> = toISOStringSafe(
    created.updated_at,
  );
  const resolvedAt = created.resolved_at
    ? toISOStringSafe(created.resolved_at)
    : null;
  const deletedAt = created.deleted_at
    ? toISOStringSafe(created.deleted_at)
    : null;
  return {
    id: created.id,
    shopping_mall_order_item_id: created.shopping_mall_order_item_id,
    shopping_mall_customer_id: created.shopping_mall_customer_id,
    shopping_mall_customer_session_id:
      created.shopping_mall_customer_session_id,
    shopping_mall_seller_id: created.shopping_mall_seller_id,
    customer_reason: created.customer_reason,
    requested_refund_amount: created.requested_refund_amount,
    status: created.status,
    created_at: createdAt,
    updated_at: updatedAt,
    resolved_at: resolvedAt,
    deleted_at: deletedAt,
  };
}
