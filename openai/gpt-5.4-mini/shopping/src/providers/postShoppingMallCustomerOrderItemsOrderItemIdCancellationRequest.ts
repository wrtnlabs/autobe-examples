import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddress";
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

export async function postShoppingMallCustomerOrderItemsOrderItemIdCancellationRequest(props: {
  customer: CustomerPayload;
  orderItemId: string & tags.Format<"uuid">;
  body: IShoppingMallCancellationRequest.ICreate;
}): Promise<IShoppingMallCancellationRequest> {
  return await MyGlobal.prisma.$transaction(async (prisma) => {
    const orderItem = await prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.orderItemId },
      select: {
        id: true,
        status: true,
        shipped_at: true,
        delivered_at: true,
        cancelled_at: true,
        refunded_at: true,
        order: {
          select: {
            shopping_mall_customer_id: true,
          },
        },
      },
    });
    if (orderItem.order.shopping_mall_customer_id !== props.customer.id) {
      throw new HttpException("Forbidden", 403);
    }
    if (orderItem.status !== "paid") {
      throw new HttpException("Cancellation request is not eligible", 409);
    }
    if (
      orderItem.shipped_at !== null ||
      orderItem.delivered_at !== null ||
      orderItem.cancelled_at !== null ||
      orderItem.refunded_at !== null
    ) {
      throw new HttpException("Cancellation request is not eligible", 409);
    }
    const existing =
      await prisma.shopping_mall_cancellation_requests.findUnique({
        where: { shopping_mall_order_item_id: orderItem.id },
        select: { id: true },
      });
    if (existing !== null) {
      throw new HttpException("Cancellation request already exists", 409);
    }
    const created = await prisma.shopping_mall_cancellation_requests.create({
      data: await ShoppingMallCancellationRequestCollector.collect({
        body: props.body,
        shoppingMallOrderItem: orderItem,
      }),
      ...ShoppingMallCancellationRequestTransformer.select(),
    });
    return await ShoppingMallCancellationRequestTransformer.transform(created);
  });
}
