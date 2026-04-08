import { IEcommerceProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductRating";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceSellerProductsProductIdRating(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<IEcommerceProductRating> {
  // Verify product exists - returns 404 if not found
  await MyGlobal.prisma.ecommerce_products.findUniqueOrThrow({
    where: { id: props.productId },
  });
  // Calculate average rating and count from non-deleted reviews
  const results = await MyGlobal.prisma.ecommerce_reviews.groupBy({
    by: ["product_id"],
    where: {
      product_id: props.productId,
      deleted_at: null,
    },
    _avg: { rating: true },
    _count: { rating: true },
  });
  // If no reviews exist, return null average and 0 count
  if (results.length === 0) {
    return {
      average_rating: null,
      review_count: 0,
    } satisfies IEcommerceProductRating;
  }
  const avgRating = results[0]._avg.rating;
  const reviewCount = results[0]._count.rating;
  return {
    average_rating: avgRating,
    review_count: reviewCount,
  } satisfies IEcommerceProductRating;
}
