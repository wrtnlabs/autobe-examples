import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
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

export async function postShoppingMallCustomerCustomersOrdersOrderIdItemsItemIdCancellationRequest(props: {
  customer: CustomerPayload;
  orderId: string;
  itemId: string;
  body: IShoppingMallCancellationRequest.ICreate;
}): Promise<IShoppingMallCancellationRequest> {
  // Step 1: Verify order ownership
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: props.orderId },
    select: { id: true, shopping_mall_customer_id: true },
  });
  if (order === null) {
    throw new HttpException("Order not found", 404);
  }
  if (order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 2: Verify order item exists and has 'paid' status
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findUnique({
    where: { id: props.itemId },
    select: {
      id: true,
      shopping_mall_order_id: true,
      status: true,
    },
  });
  if (orderItem === null) {
    throw new HttpException("Order item not found", 404);
  }
  if (orderItem.shopping_mall_order_id !== props.orderId) {
    throw new HttpException("Order item not found in this order", 404);
  }
  if (orderItem.status !== "paid") {
    throw new HttpException(
      "Cannot request cancellation for item that is not in paid status",
      400,
    );
  }
  // Step 3: Check for existing cancellation request
  const existingRequest =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findUnique({
      where: { shopping_mall_order_item_id: props.itemId },
    });
  if (existingRequest !== null) {
    throw new HttpException(
      "Cancellation request already exists for this item",
      409,
    );
  }
  // Step 4: Create cancellation request using collector
  const created =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.create({
      data: await ShoppingMallCancellationRequestCollector.collect({
        body: props.body,
        orderItem: { id: props.itemId },
      }),
      ...ShoppingMallCancellationRequestTransformer.select(),
    });
  // Step 5: Return transformed response
  return await ShoppingMallCancellationRequestTransformer.transform(created);
}
