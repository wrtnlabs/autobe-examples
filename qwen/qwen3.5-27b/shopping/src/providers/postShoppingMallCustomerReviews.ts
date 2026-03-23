import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
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

export async function postShoppingMallCustomerReviews(props: {
  customer: CustomerPayload;
  body: IShoppingMallReview.ICreate;
}): Promise<IShoppingMallReview> {
  // Verify order item exists, belongs to customer, and is delivered
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: {
        id: props.body.orderItemId,
        deleted_at: null,
        status: "delivered",
      },
      select: {
        shopping_mall_order_id: true,
      },
    });
  // Verify the order belongs to the customer
  const order = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: {
      id: orderItem.shopping_mall_order_id,
      shopping_mall_customer_id: props.customer.id,
    },
    select: {
      id: true,
    },
  });
  // Check if review already exists for this order item
  const existingReview = await MyGlobal.prisma.shopping_mall_reviews.findUnique(
    {
      where: { shopping_order_item_id: props.body.orderItemId },
    },
  );
  if (existingReview !== null) {
    throw new HttpException("Review already exists for this order item", 409);
  }
  // Create the review using collector and transformer
  const created = await MyGlobal.prisma.shopping_mall_reviews.create({
    data: await ShoppingMallReviewCollector.collect({
      body: props.body,
      shoppingMallCustomers: { id: props.customer.id },
    }),
    ...ShoppingMallReviewTransformer.select(),
  });
  return await ShoppingMallReviewTransformer.transform(created);
}
