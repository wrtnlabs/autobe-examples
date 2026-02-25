import { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
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
  // Validate reason length (10-500 characters)
  if (
    !props.body.reason ||
    props.body.reason.length < 10 ||
    props.body.reason.length > 500
  ) {
    throw new HttpException(
      "Cancellation reason must be 10-500 characters",
      400,
    );
  }
  // Find the order
  const order = await MyGlobal.prisma.ecommerce_orders.findUnique({
    where: { id: props.orderId },
  });
  if (!order) {
    throw new HttpException("Order not found", 404);
  }
  // Check order belongs to customer
  if (order.customer_id !== props.customer.id) {
    throw new HttpException("Unauthorized order", 403);
  }
  // Check payment was within 24 hours
  const now = new Date();
  const orderCreated = new Date(order.created_at);
  const timeDiffHours =
    (now.getTime() - orderCreated.getTime()) / (1000 * 60 * 60);
  if (timeDiffHours > 24) {
    throw new HttpException(
      "Cancellation request must be within 24 hours of payment",
      400,
    );
  }
  // Find eligible order item (status='paid', no shipment)
  const orderItem = await MyGlobal.prisma.ecommerce_order_items.findFirst({
    where: {
      order_id: order.id,
      status: "paid",
      deleted_at: null,
    },
  });
  if (!orderItem) {
    throw new HttpException(
      "No eligible items for cancellation (status must be paid and no shipment)",
      400,
    );
  }
  // Create cancellation request
  const created = await MyGlobal.prisma.ecommerce_cancellation_requests.create({
    data: await EcommerceCancellationRequestCollector.collect({
      body: props.body,
      ecommerceOrderItems: orderItem,
    }),
    ...EcommerceCancellationRequestTransformer.select(),
  });
  return await EcommerceCancellationRequestTransformer.transform(created);
}
