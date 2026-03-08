import { IEcommerceMallProductReviewSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewSummary";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallProductsProductIdReviewsSummary(props: {
  productId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallProductReviewSummary> {
  // Query reviews grouped by rating for non-deleted reviews of this product
  const reviews = await MyGlobal.prisma.ecommerce_mall_reviews.groupBy({
    by: ["rating"],
    where: {
      product_id: props.productId,
      is_deleted: false,
    },
    _count: {
      rating: true,
    },
  });
  // Calculate total review count
  const total = reviews.reduce((sum, r) => sum + r._count.rating, 0);
  // Calculate average rating (weighted average)
  const average =
    total > 0
      ? reviews.reduce((sum, r) => sum + r.rating * r._count.rating, 0) / total
      : null;
  // Build rating distribution with all 5 keys initialized to 0
  const distribution: {
    "1": number & tags.Type<"int32"> & tags.Minimum<0>;
    "2": number & tags.Type<"int32"> & tags.Minimum<0>;
    "3": number & tags.Type<"int32"> & tags.Minimum<0>;
    "4": number & tags.Type<"int32"> & tags.Minimum<0>;
    "5": number & tags.Type<"int32"> & tags.Minimum<0>;
  } = {
    "1": 0,
    "2": 0,
    "3": 0,
    "4": 0,
    "5": 0,
  };
  // Populate distribution from grouped results
  for (const r of reviews) {
    const key = r.rating.toString() as "1" | "2" | "3" | "4" | "5";
    distribution[key] = r._count.rating;
  }
  // Round average to 1 decimal place
  const roundedAverage =
    average !== null ? Math.round(average * 10) / 10 : null;
  return {
    average_rating: roundedAverage,
    review_count: total,
    rating_distribution: distribution,
  } satisfies IEcommerceMallProductReviewSummary;
}
