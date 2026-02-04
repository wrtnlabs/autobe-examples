import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallReviewCollector } from "../collectors/ShoppingMallReviewCollector";
import { ShoppingMallReviewTransformer } from "../transformers/ShoppingMallReviewTransformer";

export async function postShoppingMallCustomerReviews(props: {
  customer: CustomerPayload;
  body: IShoppingMallReview.ICreate;
}): Promise<IShoppingMallReview> {
  // Verify customer has a delivered order item for this product
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findFirst({
    where: {
      id: props.body.order_item_id,
      order: {
        customer_id: props.customer.id,
        status: "delivered",
      },
      deleted_at: null,
    },
  });
  if (!orderItem) {
    throw new HttpException(
      "Cannot review product: order item not delivered",
      400,
    );
  }
  // Prevent duplicate reviews
  const existingReview = await MyGlobal.prisma.shopping_mall_reviews.findFirst({
    where: {
      customer_id: props.customer.id,
      order_item_id: props.body.order_item_id,
      deleted_at: null,
    },
  });
  if (existingReview) {
    throw new HttpException("Review already exists for this product", 409);
  }
  // Create review in transaction
  const createdReview = await MyGlobal.prisma.$transaction(async (prisma) => {
    // Create review
    const created = await prisma.shopping_mall_reviews.create({
      data: await ShoppingMallReviewCollector.collect({
        body: props.body,
        shoppingMallCustomers: { id: props.customer.id },
        shoppingMallProducts: { id: orderItem.product_id },
      }),
      select: ShoppingMallReviewTransformer.select(),
    });
    // Update product average rating
    const reviews = await prisma.shopping_mall_reviews.aggregate({
      where: {
        product_id: orderItem.product_id,
        deleted_at: null,
      },
      _avg: {
        rating: true,
      },
    });
    await prisma.shopping_mall_products.update({
      where: { id: orderItem.product_id },
      data: {
        average_rating: reviews._avg.rating ?? 0,
      },
    });
    return created;
  });
  // Transform to API response
  return await ShoppingMallReviewTransformer.transform(createdReview);
}
