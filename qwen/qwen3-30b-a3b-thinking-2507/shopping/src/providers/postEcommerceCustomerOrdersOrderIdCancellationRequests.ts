import { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceCancellationRequestCollector } from "../collectors/EcommerceCancellationRequestCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceCancellationRequestTransformer } from "../transformers/EcommerceCancellationRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceCustomerOrdersOrderIdCancellationRequests(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IEcommerceCancellationRequest.ICreate;
}): Promise<IEcommerceCancellationRequest> {
  const order = await MyGlobal.prisma.ecommerce_orders.findUnique({
    where: { id: props.orderId },
    select: { id: true, status: true, customer: { select: { id: true } } },
  });
  if (!order) throw new HttpException("Order not found", 404);
  if (order.customer.id !== props.customer.id)
    throw new HttpException("Order does not belong to customer", 403);
  if (order.status === "cancelled")
    throw new HttpException("Order is already cancelled", 400);
  const created = await MyGlobal.prisma.ecommerce_cancellation_requests.create({
    data: await EcommerceCancellationRequestCollector.collect({
      body: props.body,
      ecommerceOrders: { id: order.id },
      ecommerceCustomers: { id: props.customer.id },
    }),
    ...EcommerceCancellationRequestTransformer.select(),
  });
  return await EcommerceCancellationRequestTransformer.transform(created);
}
