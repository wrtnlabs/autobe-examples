import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallCancellationRequestCollector } from "../collectors/ShoppingMallCancellationRequestCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerOrdersOrderIdItemsItemIdCancellationRequests(props: {
  customer: CustomerPayload;
  orderId: string;
  itemId: string;
  body: IShoppingMallCancellationRequest.ICreate;
}): Promise<void> {
  // Verify order item exists and belongs to the customer
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findFirst({
    where: {
      id: props.itemId,
      shopping_mall_order_id: props.orderId,
      deleted_at: null,
    },
  });
  if (!orderItem) {
    throw new HttpException(
      "Order item not found or does not belong to this order",
      404,
    );
  }
  // Verify order item belongs to the requesting customer
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      id: props.orderId,
      shopping_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
  });
  if (!order) {
    throw new HttpException(
      "Order not found or does not belong to this customer",
      403,
    );
  }
  // Check order item status is 'paid' for cancellation eligibility
  if (orderItem.status !== "paid") {
    throw new HttpException("Only paid order items can be cancelled", 400);
  }
  // Get seller info from shopping_mall_product table via product_id
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: orderItem.shopping_mall_product_id,
      deleted_at: null,
    },
    select: {
      seller: true,
    },
  });
  // Create cancellation request using existing collector
  const created =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.create({
      data: {
        ...(await ShoppingMallCancellationRequestCollector.collect({
          body: props.body,
          shoppingMallOrderItems: { id: orderItem.id },
          shoppingMallCustomers: { id: props.customer.id },
          shoppingMallSellers: {
            id: product?.seller?.id ?? "",
          },
        })),
      },
    });
  // TODO: Notify seller about the cancellation request
}
