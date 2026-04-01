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
  const orderItem =
    await MyGlobal.prisma.ecommerce_mall_order_items.findUniqueOrThrow({
      where: { id: props.orderItemId },
      select: {
        id: true,
        ecommerce_mall_order_id: true,
      },
    });
  const order = await MyGlobal.prisma.ecommerce_mall_orders.findFirstOrThrow({
    where: { id: orderItem.ecommerce_mall_order_id },
    select: { customer_id: true },
  });
  if (order.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  const existingRefund =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.findFirst({
      where: {
        ecommerce_mall_order_item_id: props.orderItemId,
        status: "processed",
      },
      select: { delivery_date: true },
    });
  if (!existingRefund) {
    throw new HttpException("Order item delivery date not available", 400);
  }
  const deliveryDate = new Date(existingRefund.delivery_date);
  const now = new Date();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  if (now.getTime() - deliveryDate.getTime() > sevenDays) {
    throw new HttpException("Refund request period has expired", 400);
  }
  const created = await MyGlobal.prisma.ecommerce_mall_refund_requests.create({
    data: await EcommerceMallRefundRequestCollector.collect({
      body: props.body,
      customer: props.customer as IEntity,
      ecommerceMallOrderItems: {
        id: orderItem.id,
        delivery_date: existingRefund.delivery_date,
      },
    }),
    ...EcommerceMallRefundRequestTransformer.select(),
  });
  return await EcommerceMallRefundRequestTransformer.transform(created);
}
