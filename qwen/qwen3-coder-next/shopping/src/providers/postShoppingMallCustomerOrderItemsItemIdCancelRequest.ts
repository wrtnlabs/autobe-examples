import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellationRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallOrderCancellationRequestCollector } from "../collectors/ShoppingMallOrderCancellationRequestCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallOrderCancellationRequestTransformer } from "../transformers/ShoppingMallOrderCancellationRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerOrderItemsItemIdCancelRequest(props: {
  customer: CustomerPayload;
  itemId: string;
  body: IShoppingMallOrderCancellationRequest.ICreate;
}): Promise<IShoppingMallOrderCancellationRequest> {
  // 1. Retrieve the order item and verify it exists
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.itemId },
      select: {
        id: true,
        item_status: true,
        order: {
          select: {
            shopping_mall_customer_id: true,
          },
        },
      },
    });
  // 2. Validate order item status is "paid"
  if (orderItem.item_status !== "paid") {
    throw new HttpException(
      "Order item must be paid to request cancellation",
      400,
    );
  }
  // 3. Validate customer ownership
  if (orderItem.order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 4. Create cancellation request record using Collector
  const createdRequest =
    await MyGlobal.prisma.shopping_mall_order_cancellation_requests.create({
      data: await ShoppingMallOrderCancellationRequestCollector.collect({
        body: props.body,
        shoppingMallOrderItems: orderItem,
        shoppingMallCustomers: { id: props.customer.id } as any,
      }),
      ...ShoppingMallOrderCancellationRequestTransformer.select(),
    });
  // 5. Create status log entry with required fields
  await MyGlobal.prisma.shopping_mall_order_cancellation_request_logs.create({
    data: {
      id: v4(),
      cancellationRequest: {
        connect: {
          id: createdRequest.id,
        },
      },
      created_at: toISOStringSafe(new Date()),
      from_status: "pending" as const,
      to_status: "pending" as const,
    },
  });
  // 6. Return transformed result
  return await ShoppingMallOrderCancellationRequestTransformer.transform(
    createdRequest,
  );
}
