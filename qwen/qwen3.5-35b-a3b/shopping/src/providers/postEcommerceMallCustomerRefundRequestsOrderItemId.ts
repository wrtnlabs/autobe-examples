import { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
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

export async function postEcommerceMallCustomerRefundRequestsOrderItemId(props: {
  customer: CustomerPayload;
  orderItemId: string & tags.Format<"uuid">;
  body: IEcommerceMallRefundRequest.ICreate;
}): Promise<IEcommerceMallRefundRequest> {
  // Step 1: Validate order item exists and retrieve it with order relationship
  const orderItem =
    await MyGlobal.prisma.ecommerce_mall_order_items.findUniqueOrThrow({
      where: { id: props.orderItemId },
      select: {
        id: true,
        order: {
          select: {
            id: true,
            customer_id: true,
            status: true,
            created_at: true,
          },
        },
      },
    });
  // Step 2: Validate order status is 'delivered'
  if (orderItem.order.status !== "delivered") {
    throw new HttpException(
      "Order item must be part of a delivered order to request refund",
      400,
    );
  }
  // Step 3: Validate customer owns the order containing this order item
  if (orderItem.order.customer_id !== props.customer.id) {
    throw new HttpException("You do not own this order", 403);
  }
  // Step 4: Validate 7-day eligibility window from order creation date
  const nowTimestamp: string & tags.Format<"date-time"> =
    new Date().toISOString();
  const nowTime: number = Date.parse(nowTimestamp);
  const deliveryTime: number = orderItem.order.created_at.getTime();
  const timeDiff: number = nowTime - deliveryTime;
  const daysDiff: number = timeDiff / (1000 * 60 * 60 * 24);
  if (daysDiff > 7) {
    throw new HttpException(
      "Refund request must be within 7 days of order delivery",
      400,
    );
  }
  // Step 5: Create refund request using collector
  const refundRequest =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.create({
      data: await EcommerceMallRefundRequestCollector.collect({
        body: props.body,
        ecommerceMallCustomers: { id: props.customer.id } as IEntity,
        ecommerceMallOrderItems: { id: orderItem.id } as IEntity,
      }),
      ...EcommerceMallRefundRequestTransformer.select(),
    });
  // Step 6: Return created refund request using transformer
  return await EcommerceMallRefundRequestTransformer.transform(refundRequest);
}
