import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
  // Query order item with relations for validation
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.body.orderItemId },
      select: {
        id: true,
        status: true,
        order: {
          select: {
            id: true,
            shopping_mall_customer_id: true,
          },
        },
        shipment: {
          select: {
            delivered_at: true,
            shipped_at: true,
          },
        },
      },
    });
  // Validate customer ownership
  if (orderItem.order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate delivered status
  if (orderItem.status !== "delivered") {
    throw new HttpException(
      "Order item must be delivered to request refund",
      400,
    );
  }
  // Validate 7-day eligibility window from delivery
  const shipment = orderItem.shipment;
  if (!shipment) {
    throw new HttpException("Order item has no shipment", 400);
  }
  // Calculate delivery date: actual delivery or auto-delivery (14 days after shipped)
  const deliveredAt =
    shipment.delivered_at ??
    new Date(
      new Date(shipment.shipped_at).getTime() + 14 * 24 * 60 * 60 * 1000,
    );
  const deliveredTimestamp = deliveredAt.getTime();
  const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
  const currentTimestamp = Date.now();
  if (currentTimestamp - deliveredTimestamp > sevenDaysInMs) {
    throw new HttpException(
      "Refund request must be within 7 days of delivery",
      400,
    );
  }
  // Check for existing refund request (unique constraint per order item)
  const existingRequest =
    await MyGlobal.prisma.shopping_mall_refund_requests.findUnique({
      where: { shopping_mall_order_item_id: props.body.orderItemId },
    });
  if (existingRequest) {
    throw new HttpException(
      "Refund request already exists for this order item",
      409,
    );
  }
  // Create refund request using collector
  const created = await MyGlobal.prisma.shopping_mall_refund_requests.create({
    data: await ShoppingMallRefundRequestCollector.collect({
      body: props.body,
    }),
    ...ShoppingMallRefundRequestTransformer.select(),
  });
  return await ShoppingMallRefundRequestTransformer.transform(created);
}
