import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallCancellationRequestTransformer } from "../transformers/EcommerceMallCancellationRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallCustomerCancellationRequests(props: {
  customer: CustomerPayload;
  body: IEcommerceMallCancellationRequest.ICreate;
}): Promise<IEcommerceMallCancellationRequest> {
  const orderItem =
    await MyGlobal.prisma.ecommerce_mall_order_items.findUniqueOrThrow({
      where: {
        id: props.body.order_item_id,
        deleted_at: null,
      },
      select: {
        id: true,
        item_status: true,
        order: { select: { customer_id: true } },
      },
    });
  if (orderItem.item_status !== "paid") {
    throw new HttpException("Order item must be in paid status to cancel", 400);
  }
  if (orderItem.order.customer_id !== props.customer.id) {
    throw new HttpException("Order item does not belong to the customer", 403);
  }
  const customer =
    await MyGlobal.prisma.ecommerce_mall_customers.findUniqueOrThrow({
      where: { id: props.customer.id, deleted_at: null },
      select: { is_banned: true },
    });
  if (customer.is_banned) {
    throw new HttpException("Customer account is banned", 403);
  }
  const existingRequest =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findFirst({
      where: {
        order_item_id: props.body.order_item_id,
        deleted_at: null,
        request_status: "approved",
      },
    });
  if (existingRequest !== null) {
    throw new HttpException(
      "Cancellation request already exists for this order item",
      409,
    );
  }
  const created =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.create({
      data: {
        id: v4(),
        customer_id: props.customer.id,
        order_item_id: props.body.order_item_id,
        reason: props.body.reason,
        request_status: "pending",
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
        deleted_at: null,
      },
      include: {
        customer: true,
        orderItem: true,
        statusSnapshots: true,
      },
    });
  return EcommerceMallCancellationRequestTransformer.transform(created);
}
