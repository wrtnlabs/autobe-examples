import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequest";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
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

export async function postEcommerceCustomerOrdersOrderIdItemsItemIdRefundRequests(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  body: IEcommerceRefundRequest.ICreate;
}): Promise<IEcommerceRefundRequest> {
  // Step 1: Verify customer owns the order
  const order = await MyGlobal.prisma.ecommerce_orders.findFirst({
    where: {
      id: props.orderId,
      ecommerce_customer_id: props.customer.id,
      deleted_at: null,
    },
  });
  if (order === null) {
    throw new HttpException("Order not found or access denied", 404);
  }
  // Step 2: Retrieve the order item
  const orderItem = await MyGlobal.prisma.ecommerce_order_items.findFirst({
    where: {
      id: props.itemId,
      ecommerce_order_id: props.orderId,
      deleted_at: null,
    },
  });
  if (orderItem === null) {
    throw new HttpException("Order item not found", 404);
  }
  // Step 3: Check order item status is 'delivered'
  if (orderItem.status !== "delivered") {
    throw new HttpException(
      "Order item must be delivered to request refund",
      400,
    );
  }
  // Step 4: Verify delivery date is within 7 days
  const now = new Date();
  const itemDate = new Date(orderItem.created_at);
  const daysDiff = (now.getTime() - itemDate.getTime()) / (1000 * 60 * 60 * 24);
  if (daysDiff > 7) {
    throw new HttpException(
      "Refund request must be submitted within 7 days of delivery",
      400,
    );
  }
  // Step 5: Check for existing refund request
  const existingRefund =
    await MyGlobal.prisma.ecommerce_refund_requests.findFirst({
      where: {
        ecommerce_order_item_id: props.itemId,
        deleted_at: null,
      },
    });
  if (existingRefund !== null) {
    throw new HttpException(
      "Refund request already exists for this order item",
      409,
    );
  }
  // Step 6: Create refund request using Collector
  const record = await MyGlobal.prisma.ecommerce_refund_requests.create({
    data: await EcommerceRefundRequestCollector.collect({
      body: props.body,
      ecommerceOrderItems: orderItem,
    }),
    ...EcommerceRefundRequestTransformer.select(),
  });
  // Step 7: Return transformed response
  return await EcommerceRefundRequestTransformer.transform(record);
}
