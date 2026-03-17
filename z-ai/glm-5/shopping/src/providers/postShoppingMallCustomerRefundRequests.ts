import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallRefundRequestCollector } from "../collectors/ShoppingMallRefundRequestCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallRefundRequestTransformer } from "../transformers/ShoppingMallRefundRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerRefundRequests(props: {
  customer: CustomerPayload;
  body: IShoppingMallRefundRequest.ICreate;
}): Promise<IShoppingMallRefundRequest> {
  // 1. Find the order item with order and shipment relations
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findUnique({
    where: { id: props.body.orderItemId },
    select: {
      id: true,
      status: true,
      shopping_mall_order_id: true,
      shopping_mall_shipment_id: true,
      order: {
        select: {
          id: true,
          shopping_mall_customer_id: true,
        },
      },
      shipment: {
        select: {
          id: true,
          delivered_at: true,
        },
      },
    },
  });
  // 2. Return 404 if order item not found
  if (orderItem === null) {
    throw new HttpException("Order item not found", 404);
  }
  // 3. Check ownership - order must belong to authenticated customer
  if (orderItem.order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 4. Validate status is 'delivered'
  if (orderItem.status !== "delivered") {
    throw new HttpException(
      "Refund can only be requested for delivered items",
      400,
    );
  }
  // 5. Check 7-day eligibility window
  if (orderItem.shipment === null || orderItem.shipment.delivered_at === null) {
    throw new HttpException("Delivery date not found", 400);
  }
  const deliveryDate = orderItem.shipment.delivered_at;
  const now = new Date();
  const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
  const eligibilityDeadline = new Date(deliveryDate.getTime() + sevenDaysInMs);
  if (now > eligibilityDeadline) {
    throw new HttpException(
      "Refund request must be made within 7 days of delivery",
      400,
    );
  }
  // 6. Check for duplicate refund request
  const existingRequest =
    await MyGlobal.prisma.shopping_mall_refund_requests.findUnique({
      where: { shopping_mall_order_item_id: props.body.orderItemId },
    });
  if (existingRequest !== null) {
    throw new HttpException(
      "A refund request already exists for this order item",
      409,
    );
  }
  // 7. Create refund request using Collector
  const created = await MyGlobal.prisma.shopping_mall_refund_requests.create({
    data: await ShoppingMallRefundRequestCollector.collect({
      body: props.body,
    }),
    ...ShoppingMallRefundRequestTransformer.select(),
  });
  // 8. Return transformed response
  return await ShoppingMallRefundRequestTransformer.transform(created);
}
