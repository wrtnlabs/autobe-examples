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

export async function postShoppingMallCustomerCancellationRequests(props: {
  customer: CustomerPayload;
  body: IShoppingMallCancellationRequest.ICreate;
}): Promise<IShoppingMallCancellationRequest> {
  const now = toISOStringSafe(new Date());
  const body = props.body as any;
  const order_item_id = body.order_item_id;
  const reason = body.reason;
  if (typeof order_item_id !== "string" || typeof reason !== "string") {
    throw new HttpException("Invalid request body", 400);
  }
  const existingRequest =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findFirst({
      where: {
        shopping_mall_order_item_id: order_item_id,
        deleted_at: null,
      },
    });
  if (existingRequest !== null) {
    throw new HttpException(
      "Active cancellation request already exists for this order item",
      400,
    );
  }
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findUnique({
    where: { id: order_item_id },
  });
  if (orderItem === null) {
    throw new HttpException("Order item not found", 404);
  }
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: orderItem.shopping_mall_order_id },
  });
  if (order === null || order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Order item not found or access denied", 404);
  }
  const customer = await MyGlobal.prisma.shopping_mall_customers.findUnique({
    where: { id: props.customer.id },
  });
  if (customer === null) {
    throw new HttpException("Customer not found", 404);
  }
  const createInput: Prisma.shopping_mall_cancellation_requestsCreateInput = {
    id: v4() as string & tags.Format<"uuid">,
    reason: reason,
    seller_approval_status: "pending",
    seller_approval_reason: null,
    requested_at: now,
    processed_at: null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    customer: {
      connect: { id: props.customer.id as string & tags.Format<"uuid"> },
    },
    orderItem: { connect: { id: order_item_id } },
  };
  const created =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.create({
      data: createInput,
    });
  return {
    id: created.id,
    shopping_mall_customer_id: created.shopping_mall_customer_id,
    shopping_mall_order_item_id: created.shopping_mall_order_item_id,
    reason: created.reason,
    seller_approval_status: created.seller_approval_status,
    seller_approval_reason: created.seller_approval_reason,
    requested_at: toISOStringSafe(created.requested_at),
    processed_at:
      created.processed_at === null
        ? null
        : toISOStringSafe(created.processed_at),
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null ? null : toISOStringSafe(created.deleted_at),
  };
}
