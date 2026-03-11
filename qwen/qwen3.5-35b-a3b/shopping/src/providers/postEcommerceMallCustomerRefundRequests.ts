import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallRefundRequestCollector } from "../collectors/EcommerceMallRefundRequestCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallRefundRequestTransformer } from "../transformers/EcommerceMallRefundRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallCustomerRefundRequests(props: {
  customer: CustomerPayload;
  body: IEcommerceMallRefundRequest.ICreate;
}): Promise<IEcommerceMallRefundRequest> {
  // Validate reason is non-empty
  if (props.body.reason.trim().length === 0) {
    throw new HttpException("Reason is required", 400);
  }
  // Fetch order item to validate eligibility
  const orderItem =
    await MyGlobal.prisma.ecommerce_mall_order_items.findUniqueOrThrow({
      where: { id: props.body.orderItemId },
      select: {
        item_status: true,
        updated_at: true,
        order: {
          select: { customer_id: true },
        },
      },
    });
  // Verify item status is delivered
  if (orderItem.item_status !== "delivered") {
    throw new HttpException(
      "Order item must be delivered to request refund",
      422,
    );
  }
  // Verify customer owns the order containing this item
  if (orderItem.order.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Check for existing refund request (unique constraint on order_item_id)
  const existingRequest =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.findUnique({
      where: { order_item_id: props.body.orderItemId },
    });
  if (existingRequest !== null && existingRequest.deleted_at === null) {
    throw new HttpException(
      "Refund request already exists for this order item",
      409,
    );
  }
  // Calculate 7-day time limit
  const deliveryDate = new Date(orderItem.updated_at);
  const timeLimitDate = new Date(deliveryDate);
  timeLimitDate.setDate(timeLimitDate.getDate() + 7);
  // Verify within 7-day window
  const now = new Date();
  if (now > timeLimitDate) {
    throw new HttpException(
      "Refund request window has expired (7 days from delivery)",
      422,
    );
  }
  // Create refund request using collector with manual time_limit override
  const refundRequestInput = await EcommerceMallRefundRequestCollector.collect({
    body: props.body,
    ecommerceMallCustomers: { id: props.customer.id },
    ecommerceMallCustomerSessions: { id: props.customer.session_id },
  });
  const created = await MyGlobal.prisma.ecommerce_mall_refund_requests.create({
    data: {
      ...refundRequestInput,
      time_limit: timeLimitDate,
    },
    ...EcommerceMallRefundRequestTransformer.select(),
  });
  // Transform and return response
  return await EcommerceMallRefundRequestTransformer.transform(created);
}
