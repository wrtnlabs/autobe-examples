import { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
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

export async function postEcommerceCustomerOrdersOrderIdItemsItemIdCancellationRequests(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  body: IEcommerceCancellationRequest.ICreate;
}): Promise<IEcommerceCancellationRequest> {
  // Step 1: Validate order exists and belongs to customer
  const order = await MyGlobal.prisma.ecommerce_orders.findUnique({
    where: { id: props.orderId },
    select: { id: true, ecommerce_customer_id: true },
  });
  if (order === null) {
    throw new HttpException("Order not found", 404);
  }
  if (order.ecommerce_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 2: Validate order item exists and belongs to order
  const orderItem = await MyGlobal.prisma.ecommerce_order_items.findUnique({
    where: { id: props.itemId },
    select: { id: true, ecommerce_order_id: true, status: true },
  });
  if (orderItem === null) {
    throw new HttpException("Order item not found", 404);
  }
  if (orderItem.ecommerce_order_id !== props.orderId) {
    throw new HttpException("Order item does not belong to this order", 404);
  }
  // Step 3: Check order item status is 'paid'
  if (orderItem.status !== "paid") {
    throw new HttpException(
      "Order item is not eligible for cancellation. Only items with 'paid' status can be cancelled.",
      400,
    );
  }
  // Step 4: Check no existing active cancellation request
  const existingRequest =
    await MyGlobal.prisma.ecommerce_cancellation_requests.findUnique({
      where: { ecommerce_order_item_id: props.itemId },
      select: { id: true, deleted_at: true },
    });
  if (existingRequest !== null && existingRequest.deleted_at === null) {
    throw new HttpException(
      "A cancellation request already exists for this order item",
      400,
    );
  }
  // Step 5: Create cancellation request using collector
  const record = await MyGlobal.prisma.ecommerce_cancellation_requests.create({
    data: await EcommerceCancellationRequestCollector.collect({
      body: props.body,
      ecommerceOrderItems: orderItem,
    }),
    ...EcommerceCancellationRequestTransformer.select(),
  });
  // Step 6: Return transformed result
  return await EcommerceCancellationRequestTransformer.transform(record);
}
