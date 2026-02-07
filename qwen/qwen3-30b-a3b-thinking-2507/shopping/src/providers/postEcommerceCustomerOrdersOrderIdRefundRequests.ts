import { IEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceRefundRequestCollector } from "../collectors/EcommerceRefundRequestCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceRefundRequestTransformer } from "../transformers/EcommerceRefundRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceCustomerOrdersOrderIdRefundRequests(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IEcommerceRefundRequest.ICreate;
}): Promise<IEcommerceRefundRequest> {
  const order = await MyGlobal.prisma.ecommerce_orders.findUnique({
    where: { id: props.orderId },
  });
  if (!order) throw new HttpException("Order not found", 404);
  const ecommerceOrders: IEntity = {
    id: order.id,
  };
  const collectedData = await EcommerceRefundRequestCollector.collect({
    body: props.body,
    ecommerceOrders: ecommerceOrders,
  });
  const created = await MyGlobal.prisma.ecommerce_refund_requests.create({
    data: collectedData,
  });
  return await EcommerceRefundRequestTransformer.transform(created);
}
