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

export async function getShoppingMallCustomerCancellationRequestsRequestId(props: {
  customer: CustomerPayload;
  requestId: string;
}): Promise<IShoppingMallCancellationRequest> {
  const request =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findUnique({
      where: { id: props.requestId },
      select: {
        id: true,
        order_item_id: true,
        customer_id: true,
        reason: true,
        status: true,
        created_at: true,
        updated_at: true,
        auto_approve_at: true,
      },
    });
  if (!request) {
    throw new HttpException("Cancellation request not found", 404);
  }
  // Select the order_id from order_item to connect to order
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findUnique({
    where: { id: request.order_item_id },
    select: { order_id: true }, // Correct field to select based on schema error
  });
  if (!orderItem || !orderItem.order_id) {
    throw new HttpException("Forbidden", 403);
  }
  // Now get the order's customer_id
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: orderItem.order_id },
    select: { customer_id: true },
  });
  // Handle type mismatch: props.customer.type is literal 'customer', cannot compare with string 'admin'
  // Use typia.assert to safely convert literal to string for comparing with 'admin'
  const isOwner = order?.customer_id === props.customer.id;
  const isAdmin = typia.assert<"admin">(props.customer.type) === "admin";
  if (!isOwner && !isAdmin) {
    throw new HttpException("Forbidden", 403);
  }
  return {
    id: request.id,
    order_item_id: request.order_item_id,
    customer_id: request.customer_id,
    reason: request.reason,
    status: request.status,
    created_at: toISOStringSafe(request.created_at),
    updated_at: toISOStringSafe(request.updated_at),
    auto_approve_at: toISOStringSafe(request.auto_approve_at),
  } as IShoppingMallCancellationRequest;
}
