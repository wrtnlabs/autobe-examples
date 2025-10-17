import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerReviews(props: {
  customer: CustomerPayload;
  body: IShoppingMallReview.ICreate;
}): Promise<IShoppingMallReview> {
  const { customer, body } = props;

  // Validate order exists, belongs to customer, and is delivered
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      id: body.shopping_mall_order_id,
      shopping_mall_customer_id: customer.id,
      status: "delivered",
      deleted_at: null,
    },
    include: {
      shopping_mall_order_items: {
        include: {
          sku: true,
        },
      },
    },
  });

  if (!order) {
    throw new HttpException(
      "Order not found or not eligible for review. Only delivered orders can be reviewed.",
      404,
    );
  }

  // Verify order contains the product being reviewed
  const orderContainsProduct = order.shopping_mall_order_items.some(
    (item) =>
      item.sku.shopping_mall_product_id === body.shopping_mall_product_id,
  );

  if (!orderContainsProduct) {
    throw new HttpException(
      "The specified product was not found in this order.",
      400,
    );
  }

  // If SKU is specified, verify it matches an item in the order
  if (
    body.shopping_mall_sku_id !== null &&
    body.shopping_mall_sku_id !== undefined
  ) {
    const orderContainsSku = order.shopping_mall_order_items.some(
      (item) => item.shopping_mall_sku_id === body.shopping_mall_sku_id,
    );

    if (!orderContainsSku) {
      throw new HttpException(
        "The specified SKU variant was not found in this order.",
        400,
      );
    }
  }

  // Check for duplicate review (one review per customer per product)
  const existingReview = await MyGlobal.prisma.shopping_mall_reviews.findFirst({
    where: {
      shopping_mall_customer_id: customer.id,
      shopping_mall_product_id: body.shopping_mall_product_id,
      deleted_at: null,
    },
  });

  if (existingReview) {
    throw new HttpException(
      "You have already submitted a review for this product. Each customer can submit only one review per product.",
      409,
    );
  }

  // Verify product exists
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: body.shopping_mall_product_id,
      deleted_at: null,
    },
  });

  if (!product) {
    throw new HttpException("Product not found.", 404);
  }

  // Create the review
  const now = toISOStringSafe(new Date());
  const reviewId = v4();

  const created = await MyGlobal.prisma.shopping_mall_reviews.create({
    data: {
      id: reviewId,
      shopping_mall_customer_id: customer.id,
      shopping_mall_product_id: body.shopping_mall_product_id,
      shopping_mall_sku_id: body.shopping_mall_sku_id ?? null,
      shopping_mall_order_id: body.shopping_mall_order_id,
      rating: body.rating,
      title: body.title ?? null,
      review_text: body.review_text ?? null,
      verified_purchase: true,
      status: "pending_moderation",
      helpful_count: 0,
      not_helpful_count: 0,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    shopping_mall_customer_id: created.shopping_mall_customer_id,
    shopping_mall_product_id: created.shopping_mall_product_id,
    shopping_mall_sku_id: created.shopping_mall_sku_id ?? undefined,
    shopping_mall_order_id: created.shopping_mall_order_id,
    rating: created.rating,
    title: created.title ?? undefined,
    review_text: created.review_text ?? undefined,
    verified_purchase: created.verified_purchase,
    status: created.status,
    helpful_count: created.helpful_count,
    not_helpful_count: created.not_helpful_count,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
