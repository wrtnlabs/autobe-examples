import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallOrderItemRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemRefundRequest";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallOrderItemRefundRequestCollector } from "../collectors/EcommerceMallOrderItemRefundRequestCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallOrderItemRefundRequestTransformer } from "../transformers/EcommerceMallOrderItemRefundRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallCustomerOrderItemsOrderItemIdRefundRequests(props: {
  customer: CustomerPayload;
  orderItemId: string & tags.Format<"uuid">;
  body: IEcommerceMallOrderItemRefundRequest.ICreate;
}): Promise<IEcommerceMallOrderItemRefundRequest> {
  // 1. Validate order item exists
  const orderItem = await MyGlobal.prisma.ecommerce_mall_order_items.findFirst({
    where: {
      id: props.orderItemId,
      deleted_at: null,
    },
  });
  if (orderItem === null) {
    throw new HttpException("Order item not found", 404);
  }
  // 2. Verify the order belongs to the authenticated customer
  const order = await MyGlobal.prisma.ecommerce_mall_orders.findFirst({
    where: {
      id: orderItem.ecommerce_mall_order_id,
      ecommerce_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
  });
  if (order === null) {
    throw new HttpException("Order item not found", 404);
  }
  // 3. Verify order item status is 'delivered'
  if (orderItem.status !== "delivered") {
    throw new HttpException(
      "Order item must be delivered to request refund",
      400,
    );
  }
  // 4. Calculate days since delivery and validate <= 7
  const daysSinceDelivery = Math.floor(
    (new Date().getTime() - new Date(orderItem.created_at).getTime()) /
      (1000 * 60 * 60 * 24),
  );
  if (daysSinceDelivery > 7) {
    throw new HttpException(
      "Refund request must be made within 7 days of delivery",
      400,
    );
  }
  // 5. Check no existing refund request exists
  const existingRequest =
    await MyGlobal.prisma.ecommerce_mall_order_item_refund_requests.findUnique({
      where: {
        ecommerce_mall_order_item_id: props.orderItemId,
      },
    });
  if (existingRequest !== null) {
    throw new HttpException(
      "Refund request already exists for this order item",
      409,
    );
  }
  // 6-7. Create refund request using collector
  const refundRequest =
    await MyGlobal.prisma.ecommerce_mall_order_item_refund_requests.create({
      data: await EcommerceMallOrderItemRefundRequestCollector.collect({
        body: props.body,
        ecommerceMallOrderItems: orderItem,
      }),
      ...EcommerceMallOrderItemRefundRequestTransformer.select(),
    });
  // 8. Transform and return
  return await EcommerceMallOrderItemRefundRequestTransformer.transform(
    refundRequest,
  );
}
