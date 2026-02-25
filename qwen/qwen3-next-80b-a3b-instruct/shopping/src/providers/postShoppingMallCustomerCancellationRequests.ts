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
import { ShoppingMallCancellationRequestTransformer } from "../transformers/ShoppingMallCancellationRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function postShoppingMallCustomerCancellationRequests(props: {
  customer: CustomerPayload;
  body: IShoppingMallCancellationRequest.ICreate;
}): Promise<IShoppingMallCancellationRequest> {
  const latestPaidOrderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findFirst({
      where: {
        shopping_mall_order_id: props.customer.id,
        status: "paid",
        deleted_at: null,
      },
      orderBy: {
        created_at: "desc",
      },
      select: { id: true, status: true },
    });
  if (!latestPaidOrderItem) {
    throw new HttpException("No paid order items found for cancellation", 404);
  }
  const orderItemId = latestPaidOrderItem.id;
  const existingRequest =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findFirst({
      where: {
        order_item_id: orderItemId,
        status: "pending",
        deleted_at: null,
      },
    });
  if (existingRequest) {
    throw new HttpException(
      "Cancellation request already pending for this item",
      409,
    );
  }
  const created =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.create({
      data: await ShoppingMallCancellationRequestCollector.collect({
        body: props.body,
        shoppingMallOrderItems: { id: orderItemId },
        shoppingMallCustomers: { id: props.customer.id },
      }),
      ...ShoppingMallCancellationRequestTransformer.select(),
    });
  await MyGlobal.prisma.shopping_mall_inventory_logs.create({
    data: {
      id: v4(),
      variant_id: latestPaidOrderItem.id,
      reason: "cancellation_reserve",
      change_quantity: -1,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
  return await ShoppingMallCancellationRequestTransformer.transform(created);
}
