import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallRefundRequestCollector } from "../collectors/ShoppingMallRefundRequestCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallRefundRequestTransformer } from "../transformers/ShoppingMallRefundRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallMemberRefundRequests(props: {
  member: MemberPayload;
  body: IShoppingMallRefundRequest.ICreate;
}): Promise<IShoppingMallRefundRequest> {
  const customerId = props.member.id;
  if (props.body.customerReason.trim().length === 0) {
    throw new HttpException("Customer reason is required", 400);
  }
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.body.orderItemId },
      select: {
        id: true,
        shopping_mall_order_id: true,
        line_item_status: true,
        deleted_at: true,
      },
    });
  if (orderItem.deleted_at !== null) {
    throw new HttpException("Order item not found", 404);
  }
  const shoppingMallOrder =
    await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
      where: { id: orderItem.shopping_mall_order_id },
      select: {
        shopping_customer_id: true,
      },
    });
  if (shoppingMallOrder.shopping_customer_id !== customerId) {
    throw new HttpException("Forbidden", 403);
  }
  const isDelivered = orderItem.line_item_status === "delivered";
  if (!isDelivered) {
    throw new HttpException("Order item is not eligible for refund", 400);
  }
  const created = await MyGlobal.prisma.shopping_mall_refund_requests.create({
    data: await ShoppingMallRefundRequestCollector.collect({
      body: props.body,
    }),
    ...ShoppingMallRefundRequestTransformer.select(),
  });
  return await ShoppingMallRefundRequestTransformer.transform(created);
}
