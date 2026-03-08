import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
  // 1. Verify the order exists and belongs to the authenticated customer
  const order = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: props.body.shopping_mall_order_id },
    select: { id: true, shopping_mall_customer_id: true },
  });
  if (order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Order does not belong to you", 403);
  }
  // 2. Verify at least one order item is delivered for this product
  const deliveredItem =
    await MyGlobal.prisma.shopping_mall_order_items.findFirst({
      where: {
        shopping_mall_order_id: props.body.shopping_mall_order_id,
        shopping_mall_product_id: props.body.shopping_mall_product_id,
        status: "delivered",
      },
      select: { id: true },
    });
  if (deliveredItem === null) {
    throw new HttpException("Product has not been delivered", 400);
  }
  // 3. Check for existing review (one review per product per order)
  const existingReview = await MyGlobal.prisma.shopping_mall_reviews.findUnique(
    {
      where: {
        shopping_mall_customer_id_shopping_mall_product_id_shopping_mall_order_id:
          {
            shopping_mall_customer_id: props.customer.id,
            shopping_mall_product_id: props.body.shopping_mall_product_id,
            shopping_mall_order_id: props.body.shopping_mall_order_id,
          },
      },
    },
  );
  if (existingReview !== null) {
    throw new HttpException(
      "Review already exists for this product in this order",
      400,
    );
  }
  // 4. Create the review using Collector and Transformer
  const created = await MyGlobal.prisma.shopping_mall_reviews.create({
    data: await ShoppingMallReviewCollector.collect({
      body: props.body,
      shoppingMallCustomers: { id: props.customer.id },
    }),
    ...ShoppingMallReviewTransformer.select(),
  });
  return await ShoppingMallReviewTransformer.transform(created);
}
