import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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
  // Fetch order item with order relation to verify ownership
  const orderItem =
    await MyGlobal.prisma.ecommerce_mall_order_items.findUniqueOrThrow({
      where: { id: props.body.orderItemId },
      select: {
        id: true,
        status: true,
        order: {
          select: {
            id: true,
            customer_id: true,
          },
        } satisfies Prisma.ecommerce_mall_ordersFindManyArgs,
      },
    });
  // Validate customer ownership through order
  if (orderItem.order.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate order item status is delivered
  if (orderItem.status !== "delivered") {
    throw new HttpException(
      "Order item must be delivered to request refund",
      400,
    );
  }
  // Check for existing refund request
  const existingRefund =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.findFirst({
      where: {
        order_item_id: props.body.orderItemId,
        deleted_at: null,
      },
    });
  if (existingRefund) {
    throw new HttpException(
      "Refund request already exists for this order item",
      409,
    );
  }
  // Create refund request using collector
  const collected = await EcommerceMallRefundRequestCollector.collect({
    body: props.body,
    customer: { id: props.customer.id },
  });
  const created = await MyGlobal.prisma.ecommerce_mall_refund_requests.create({
    data: collected,
    ...EcommerceMallRefundRequestTransformer.select(),
  });
  return await EcommerceMallRefundRequestTransformer.transform(created);
}
