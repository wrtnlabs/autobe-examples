import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
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
  // 1. Look up order item to verify ownership
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: {
        id: props.body.orderItemId,
        deleted_at: null,
      },
      select: {
        id: true,
        status: true,
        shopping_mall_order_id: true,
      },
    });
  // 2. Look up order to verify customer ownership
  const order = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: {
      id: orderItem.shopping_mall_order_id,
      deleted_at: null,
    },
    select: {
      shopping_mall_customer_id: true,
    },
  });
  if (order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Verify order item status is 'delivered'
  if (orderItem.status !== "delivered") {
    throw new HttpException(
      "Order item must be delivered to request refund",
      400,
    );
  }
  // 4. Get delivery date from shipment via shipmentItems junction table
  const shipment = await MyGlobal.prisma.shopping_mall_shipments.findFirst({
    where: {
      shipmentItems: {
        some: {
          orderItem: {
            id: orderItem.id,
          },
        },
      },
      delivered_at: { not: null },
    },
    select: {
      delivered_at: true,
    },
  });
  if (!shipment?.delivered_at) {
    throw new HttpException("Order item delivery date not found", 400);
  }
  const deliveryDate = shipment.delivered_at;
  // 5. Verify within 7-day refund window
  const now = new Date();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  if (now.getTime() - deliveryDate.getTime() > sevenDaysMs) {
    throw new HttpException(
      "Refund request must be submitted within 7 days of delivery",
      400,
    );
  }
  // 6. Check no existing pending refund request for this order item
  const existingRefund =
    await MyGlobal.prisma.shopping_mall_refund_requests.findFirst({
      where: {
        shopping_mall_order_item_id: props.body.orderItemId,
        status: "pending",
        deleted_at: null,
      },
    });
  if (existingRefund) {
    throw new HttpException(
      "A pending refund request already exists for this order item",
      400,
    );
  }
  // 7. Create refund request using collector
  const created = await MyGlobal.prisma.shopping_mall_refund_requests.create({
    data: await ShoppingMallRefundRequestCollector.collect({
      body: props.body,
      shoppingMallCustomers: {
        id: props.customer.id,
      } satisfies IEntity,
      shoppingMallCustomerSessions: {
        id: props.customer.session_id,
      } satisfies IEntity,
    }),
    ...ShoppingMallRefundRequestTransformer.select(),
  });
  // 8. Transform and return result
  return await ShoppingMallRefundRequestTransformer.transform(created);
}
