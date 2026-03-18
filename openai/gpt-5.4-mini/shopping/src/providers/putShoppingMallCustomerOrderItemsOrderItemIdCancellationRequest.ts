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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallCancellationRequestTransformer } from "../transformers/ShoppingMallCancellationRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallCustomerOrderItemsOrderItemIdCancellationRequest(props: {
  customer: CustomerPayload;
  orderItemId: string & tags.Format<"uuid">;
  body: IShoppingMallCancellationRequest.IUpdate;
}): Promise<IShoppingMallCancellationRequest> {
  if (props.body.reason.trim().length === 0) {
    throw new HttpException("Cancellation reason is required.", 400);
  }
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
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
  if (
    orderItem.status !== "paid" ||
    orderItem.shipped_at !== null ||
    orderItem.delivered_at !== null ||
    orderItem.cancelled_at !== null ||
    orderItem.refunded_at !== null
  ) {
    throw new HttpException("This order item can no longer be cancelled.", 400);
  }
  const request = await MyGlobal.prisma.$transaction(async (prisma) => {
    const existing =
      await prisma.shopping_mall_cancellation_requests.findUnique({
        where: { shopping_mall_order_item_id: props.orderItemId },
        select: { id: true },
      });
    if (existing !== null) {
      await prisma.shopping_mall_cancellation_requests.update({
        where: { shopping_mall_order_item_id: props.orderItemId },
        data: {
          reason: props.body.reason,
          status: "pending",
          updated_at: new Date(),
        },
      });
    } else {
      try {
        await prisma.shopping_mall_cancellation_requests.create({
          data: {
            id: v4(),
            orderItem: { connect: { id: props.orderItemId } },
            reason: props.body.reason,
            status: "pending",
            created_at: new Date(),
            updated_at: new Date(),
            deleted_at: null,
          },
        });
      } catch (error) {
        if (
          !(error instanceof Prisma.PrismaClientKnownRequestError) ||
          error.code !== "P2002"
        ) {
          throw error;
        }
        await prisma.shopping_mall_cancellation_requests.update({
          where: { shopping_mall_order_item_id: props.orderItemId },
          data: {
            reason: props.body.reason,
            status: "pending",
            updated_at: new Date(),
          },
        });
      }
    }
    return await prisma.shopping_mall_cancellation_requests.findUniqueOrThrow({
      where: { shopping_mall_order_item_id: props.orderItemId },
      ...ShoppingMallCancellationRequestTransformer.select(),
    });
  });
  return await ShoppingMallCancellationRequestTransformer.transform(request);
}
