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
  // Find customer's most recent order
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      shopping_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
    orderBy: {
      created_at: "desc",
    },
    include: {
      shopping_mall_order_items: {
        take: 1,
      },
    },
  });

  if (
    !order ||
    !order.shopping_mall_order_items ||
    order.shopping_mall_order_items.length === 0
  ) {
    throw new HttpException(
      "You must have purchased a product to write a review",
      403,
    );
  }

  const firstItem = order.shopping_mall_order_items[0];
  if (!firstItem) {
    throw new HttpException("Cannot determine product for review", 403);
  }

  // Extract product_id from the first order item's relation
  const productVariantId = firstItem.shopping_mall_product_variant_id;
  if (!productVariantId) {
    throw new HttpException("Cannot determine product for review", 403);
  }

  // Find the product variant to get the associated product ID
  const productVariant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUnique({
      where: { id: productVariantId },
      select: { shopping_mall_product_id: true },
    });

  if (!productVariant || !productVariant.shopping_mall_product_id) {
    throw new HttpException("Cannot determine product for review", 403);
  }

  const product_id = productVariant.shopping_mall_product_id;

  // Create review
  const review = await MyGlobal.prisma.shopping_mall_reviews.create({
    data: {
      id: v4() as string & tags.Format<"uuid">, // Fixed: Added required id field with properly typed UUID
      shopping_mall_product_id: product_id,
      shopping_mall_customer_id: props.customer.id,
      title: props.body.title ?? null,
      body: props.body.body,
      rating: props.body.rating ?? 3,
      status: "pending" as "pending" | "rejected" | "approved" | "flagged", // Fixed: Type assertion for literal union type
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: review.id,
    title: review.title ?? "",
    body: review.body,
    rating: review.rating,
    status: review.status as "pending" | "rejected" | "approved" | "flagged", // Fixed: Type assertion for literal union type
  };
}
