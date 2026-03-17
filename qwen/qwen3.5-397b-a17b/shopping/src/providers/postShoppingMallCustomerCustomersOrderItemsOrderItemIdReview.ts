import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallReviewCollector } from "../collectors/ShoppingMallReviewCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallReviewTransformer } from "../transformers/ShoppingMallReviewTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerCustomersOrderItemsOrderItemIdReview(props: {
  customer: CustomerPayload;
  orderItemId: string & tags.Format<"uuid">;
  body: IShoppingMallReview.ICreate;
}): Promise<IShoppingMallReview> {
  // Validate order item exists and get order reference
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.orderItemId },
      select: {
        id: true,
        shopping_mall_order_id: true,
        status: true,
      },
    });
  // Verify order belongs to authenticated customer
  const order = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: orderItem.shopping_mall_order_id },
    select: { customer_id: true },
  });
  if (order.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify order item status is DELIVERED
  if (orderItem.status !== "DELIVERED") {
    throw new HttpException(
      "Review can only be written for delivered items",
      400,
    );
  }
  // Check for existing review (unique constraint on shopping_order_item_id)
  const existingReview = await MyGlobal.prisma.shopping_mall_reviews.findFirst({
    where: {
      shopping_order_item_id: props.orderItemId,
      deleted: false,
    },
  });
  if (existingReview) {
    throw new HttpException("Review already exists for this order item", 409);
  }
  // Create review using collector
  const created = await MyGlobal.prisma.shopping_mall_reviews.create({
    data: await ShoppingMallReviewCollector.collect({
      body: props.body,
      shoppingMallCustomers: { id: props.customer.id },
      shoppingMallCustomerSessions: { id: props.customer.session_id },
      shoppingMallOrderItems: { id: props.orderItemId },
    }),
    ...ShoppingMallReviewTransformer.select(),
  });
  return await ShoppingMallReviewTransformer.transform(created);
}
