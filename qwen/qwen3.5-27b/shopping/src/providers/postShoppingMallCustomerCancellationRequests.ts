import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallCancellationRequestCollector } from "../collectors/ShoppingMallCancellationRequestCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallCancellationRequestTransformer } from "../transformers/ShoppingMallCancellationRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerCancellationRequests(props: {
  customer: CustomerPayload;
  body: IShoppingMallCancellationRequest.ICreate;
}): Promise<IShoppingMallCancellationRequest> {
  // Validate order item exists and belongs to customer
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findUnique({
    where: {
      id: props.body.orderItemId,
    },
    select: {
      id: true,
      status: true,
      shopping_mall_order_id: true,
    },
  });
  if (orderItem === null) {
    throw new HttpException("Order item not found", 404);
  }
  // Verify order item belongs to authenticated customer
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: {
      id: orderItem.shopping_mall_order_id,
    },
    select: {
      id: true,
      shopping_mall_customer_id: true,
    },
  });
  if (order === null || order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Check order item status is 'paid'
  if (orderItem.status !== "paid") {
    throw new HttpException(
      "Order item cannot be cancelled - already shipped or processed",
      400,
    );
  }
  // Check for duplicate cancellation request
  const existingRequest =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findFirst({
      where: {
        shopping_mall_order_item_id: props.body.orderItemId,
        shopping_mall_customer_id: props.customer.id,
        deleted_at: null,
      },
    });
  if (existingRequest !== null) {
    throw new HttpException(
      "Cancellation request already exists for this order item",
      400,
    );
  }
  // Create cancellation request
  const created =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.create({
      data: await ShoppingMallCancellationRequestCollector.collect({
        body: props.body,
        shoppingMallCustomers: {
          id: props.customer.id,
        } satisfies IEntity,
      }),
      ...ShoppingMallCancellationRequestTransformer.select(),
    });
  return await ShoppingMallCancellationRequestTransformer.transform(created);
}
