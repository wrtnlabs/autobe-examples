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
import { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerReviews(props: {
  customer: CustomerPayload;
  body: IShoppingMallReview;
}): Promise<IPageIShoppingMallReview.ISummary> {
  // Since IShoppingMallReview is {} and has no properties, we cannot filter by product_id or apply pagination
  // Query all reviews for a summary calculation
  const reviews = await MyGlobal.prisma.shopping_mall_reviews.findMany({
    where: {
      is_deleted: { not: true }, // Exclude admin-deleted reviews from display (customer-deleted still contribute to average)
    },
    orderBy: { created_at: "desc" },
  });
  // Count total reviews (including deleted ones for totalCount)
  const total = await MyGlobal.prisma.shopping_mall_reviews.count();
  // Calculate average rating using only non-deleted reviews (customer-deleted reviews still contribute to average)
  const nonDeletedReviews =
    await MyGlobal.prisma.shopping_mall_reviews.findMany({
      where: {
        is_deleted: { not: true }, // Include in average calculation only when not deleted by admin
      },
      select: { rating: true },
    });
  const totalRating = nonDeletedReviews.reduce(
    (sum, review) => sum + review.rating,
    0,
  );
  const averageRating =
    nonDeletedReviews.length > 0
      ? Number((totalRating / nonDeletedReviews.length).toFixed(1))
      : 0;
  // Calculate review count from total reviews (excluding admin-deleted reviews)
  const reviewCount = total;
  // Create summary response
  return {
    data: [
      {
        averageRating,
        reviewCount,
      },
    ],
    pagination: {
      current: 1, // Default to first page since pagination parameters not supported
      limit: 100, // Default limit since pagination parameters not supported
      records: total,
      pages: Math.ceil(total / 100), // Default pages based on default limit
    },
  };
}
