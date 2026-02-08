import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
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

export async function postShoppingMallCustomerOrdersItemsOrderItemIdCancellationRequest(props: {
  customer: CustomerPayload;
  orderItemId: string & tags.Format<"uuid">;
  body: {
    reason: string;
  };
}): Promise<IShoppingMallCancellationRequest> {
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findUnique({
    where: { id: props.orderItemId },
    select: { shopping_mall_order_id: true, id: true },
  });
  if (!orderItem) throw new HttpException("Forbidden", 403);
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: orderItem.shopping_mall_order_id },
    select: { shopping_mall_customer_id: true },
  });
  if (!order || order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (typeof props.body.reason !== "string") {
    throw new HttpException("Bad Request: reason is required", 400);
  }
  const nowIso: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.create({
      data: {
        id: v4(),
        shopping_mall_customer_id: props.customer.id,
        shopping_mall_order_item_id: props.orderItemId,
        reason: props.body.reason,
        seller_approval_status: "pending",
        seller_approval_reason: null,
        requested_at: nowIso,
        processed_at: null,
        created_at: nowIso,
        updated_at: nowIso,
        deleted_at: null,
      },
    });
  return {
    id: created.id,
    shopping_mall_customer_id: created.shopping_mall_customer_id,
    shopping_mall_order_item_id: created.shopping_mall_order_item_id,
    reason: created.reason,
    seller_approval_status: created.seller_approval_status,
    seller_approval_reason: created.seller_approval_reason,
    requested_at: created.requested_at,
    processed_at: created.processed_at,
    created_at: created.created_at,
    updated_at: created.updated_at,
    deleted_at: created.deleted_at,
  };
}
