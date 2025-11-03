import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingReviewRatingAggregate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingReviewRatingAggregate";

export async function getShoppingProductsProductIdReviewAggregates(props: {
  productId: string & tags.Format<"uuid">;
}): Promise<IShoppingReviewRatingAggregate> {
  // Step 1: Verify product existence
  const product = await MyGlobal.prisma.shopping_products.findUnique({
    where: { id: props.productId },
    select: { id: true },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }

  // Step 2: Find review aggregate for this product
  const aggregate =
    await MyGlobal.prisma.shopping_review_rating_aggregates.findFirst({
      where: { shopping_product_id: props.productId },
    });
  if (!aggregate) {
    throw new HttpException("Review rating aggregate not found", 404);
  }

  // Step 3: Map to API type, ensuring proper typing/branding
  return {
    id: aggregate.id,
    shopping_sku_id: aggregate.shopping_sku_id,
    shopping_product_id: aggregate.shopping_product_id,
    review_count: aggregate.review_count,
    average_rating: aggregate.average_rating,
    product_review_count: aggregate.product_review_count,
    product_average_rating: aggregate.product_average_rating,
    updated_at: toISOStringSafe(aggregate.updated_at),
  };
}
