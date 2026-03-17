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
  // 1. Query order item with order relation to verify ownership and delivery status
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.body.orderItem },
      select: {
        id: true,
        status: true,
        shopping_mall_order_id: true,
        shopping_mall_product_id: true,
        order: {
          select: {
            id: true,
            shopping_mall_customer_id: true,
          },
        },
      },
    });
  // 2. Verify ownership - order must belong to authenticated customer
  if (orderItem.order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Verify delivery status - reviews only allowed for delivered items
  if (orderItem.status !== "delivered") {
    throw new HttpException("Order item not yet delivered", 422);
  }
  // 4. Check uniqueness constraint (one review per product per order per customer)
  const existingReview = await MyGlobal.prisma.shopping_mall_reviews.findUnique(
    {
      where: {
        shopping_mall_customer_id_shopping_mall_product_id_shopping_mall_order_id:
          {
            shopping_mall_customer_id: props.customer.id,
            shopping_mall_product_id: orderItem.shopping_mall_product_id,
            shopping_mall_order_id: orderItem.shopping_mall_order_id,
          },
      },
    },
  );
  if (existingReview) {
    throw new HttpException(
      "Review already exists for this product in this order",
      409,
    );
  }
  // 5. Create the review using Collector for data preparation
  const created = await MyGlobal.prisma.shopping_mall_reviews.create({
    data: await ShoppingMallReviewCollector.collect({
      body: props.body,
      customer: props.customer,
    }),
    ...ShoppingMallReviewTransformer.select(),
  });
  // 6. Transform and return the created review
  return await ShoppingMallReviewTransformer.transform(created);
}
