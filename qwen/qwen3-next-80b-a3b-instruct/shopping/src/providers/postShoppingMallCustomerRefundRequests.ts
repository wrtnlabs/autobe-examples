import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
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
  // Find the order item and verify it belongs to the customer and is delivered
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: {
        id: props.body.order_item_id,
      },
      select: {
        id: true,
        status: true,
        updated_at: true,
        shopping_mall_order_id: true,
      },
    });
  // Validate that the order item belongs to the customer
  if (orderItem.shopping_mall_order_id !== props.customer.id) {
    throw new HttpException(
      "Order item not found or not owned by customer",
      404,
    );
  }
  // Validate that the item is delivered
  if (orderItem.status !== "delivered") {
    throw new HttpException(
      'Order item must have status "delivered" to request refund',
      400,
    );
  }
  // Get the delivery timestamp (updated_at is set when status is changed to delivered)
  const deliveryDate = orderItem.updated_at;
  // Convert to string & Format<'date-time'>
  const deliveryDateSafe = deliveryDate.toISOString() satisfies string &
    tags.Format<"date-time">;
  // Calculate 7 days ago (168 hours) as string & Format<'date-time'>
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setTime(sevenDaysAgo.getTime() - 168 * 60 * 60 * 1000);
  const sevenDaysAgoString = sevenDaysAgo.toISOString() satisfies string &
    tags.Format<"date-time">;
  // Validate refund request is within 7-day window
  if (deliveryDateSafe < sevenDaysAgoString) {
    throw new HttpException(
      "Refund request must be made within 7 days of delivery confirmation",
      400,
    );
  }
  // Create refund request using collector
  const refundRequest =
    await MyGlobal.prisma.shopping_mall_refund_requests.create({
      data: await ShoppingMallRefundRequestCollector.collect({
        body: props.body,
        shoppingMallCustomers: props.customer,
      }),
      ...ShoppingMallRefundRequestTransformer.select(),
    });
  return await ShoppingMallRefundRequestTransformer.transform(refundRequest);
}
