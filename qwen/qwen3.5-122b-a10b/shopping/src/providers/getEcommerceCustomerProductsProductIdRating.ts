import { IEcommerceProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductRating";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceCustomerProductsProductIdRating(props: {
  customer: CustomerPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<IEcommerceProductRating> {
  // Verify product exists (404 if not found)
  await MyGlobal.prisma.ecommerce_products.findUniqueOrThrow({
    where: { id: props.productId },
  });
  // Calculate average rating and review count from non-deleted reviews
  const ratingStats = await MyGlobal.prisma.ecommerce_reviews.groupBy({
    by: ["product_id"],
    where: {
      product_id: props.productId,
      deleted_at: null,
    },
    _avg: {
      rating: true,
    },
    _count: {
      rating: true,
    },
  });
  // If no reviews exist, ratingStats will be empty array
  if (ratingStats.length === 0) {
    return {
      average_rating: null,
      review_count: 0,
    } satisfies IEcommerceProductRating;
  }
  const stats = ratingStats[0];
  return {
    average_rating: stats._avg.rating ?? null,
    review_count: stats._count.rating,
  } satisfies IEcommerceProductRating;
}
