import { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
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

export async function patchEcommerceMallCustomerProductsProductIdReviewStats(props: {
  customer: CustomerPayload;
  productId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductReviewStat.IRequest;
}): Promise<IEcommerceMallProductReviewStat.ISummary> {
  // Build WHERE clause for filtering active reviews
  const whereInput: Prisma.ecommerce_mall_reviewsWhereInput = {
    product_id: props.productId,
    deleted_at: null,
    ...(props.body.is_verified_purchase !== undefined && {
      is_verified_purchase: props.body.is_verified_purchase,
    }),
    ...(props.body.rating_min !== undefined && {
      rating: {
        gte: props.body.rating_min,
      },
    }),
    ...(props.body.rating_max !== undefined && {
      rating: {
        lte: props.body.rating_max,
      },
    }),
    ...(props.body.created_at_after !== undefined && {
      created_at: {
        gt: props.body.created_at_after,
      },
    }),
    ...(props.body.created_at_before !== undefined && {
      created_at: {
        lt: props.body.created_at_before,
      },
    }),
  };
  // Query total count
  const totalCount = await MyGlobal.prisma.ecommerce_mall_reviews.count({
    where: whereInput,
  });
  // Handle edge case: no reviews exist
  if (totalCount === 0) {
    return {
      averageRating: 0,
      totalCount: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
      ratingDistribution: {
        "1": 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
        "2": 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
        "3": 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
        "4": 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
        "5": 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
      },
      verifiedPurchaseCount: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
      unverifiedPurchaseCount: 0 as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      oldestReviewAt: null,
      newestReviewAt: null,
    } satisfies IEcommerceMallProductReviewStat.ISummary;
  }
  // Query average rating
  const avgResult = await MyGlobal.prisma.ecommerce_mall_reviews.aggregate({
    where: whereInput,
    _avg: {
      rating: true,
    },
  });
  const averageRating = avgResult._avg.rating
    ? Math.round(avgResult._avg.rating * 100) / 100
    : 0;
  // Query rating distribution
  const distributionResult =
    await MyGlobal.prisma.ecommerce_mall_reviews.groupBy({
      by: ["rating"],
      where: whereInput,
      _count: {
        rating: true,
      },
    });
  // Initialize distribution with all 5 levels at 0
  const ratingDistribution: {
    [key: string]: number & tags.Type<"int32"> & tags.Minimum<0>;
  } = {
    "1": 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
    "2": 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
    "3": 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
    "4": 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
    "5": 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  };
  // Populate distribution from query results
  for (const item of distributionResult) {
    const count = item._count.rating;
    ratingDistribution["1"] = count === 1 ? 0 : ratingDistribution["1"];
    ratingDistribution["2"] = count === 2 ? 0 : ratingDistribution["2"];
    ratingDistribution["3"] = count === 3 ? 0 : ratingDistribution["3"];
    ratingDistribution["4"] = count === 4 ? 0 : ratingDistribution["4"];
    ratingDistribution["5"] = count === 5 ? 0 : ratingDistribution["5"];
  }
  // Correct approach: use switch-like pattern
  const finalRatingDistribution: {
    [key: string]: number & tags.Type<"int32"> & tags.Minimum<0>;
  } = {
    "1": 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
    "2": 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
    "3": 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
    "4": 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
    "5": 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  };
  for (const item of distributionResult) {
    finalRatingDistribution[item.rating.toString()] = item._count.rating ?? 0;
  }
  // Query verified purchase count
  const verifiedWhere = {
    ...whereInput,
    is_verified_purchase: true,
  } satisfies Prisma.ecommerce_mall_reviewsWhereInput;
  const verifiedPurchaseCount =
    await MyGlobal.prisma.ecommerce_mall_reviews.count({
      where: verifiedWhere,
    });
  // Query unverified purchase count
  const unverifiedWhere = {
    ...whereInput,
    is_verified_purchase: false,
  } satisfies Prisma.ecommerce_mall_reviewsWhereInput;
  const unverifiedPurchaseCount =
    await MyGlobal.prisma.ecommerce_mall_reviews.count({
      where: unverifiedWhere,
    });
  // Query oldest and newest review dates
  const dateResult = await MyGlobal.prisma.ecommerce_mall_reviews.aggregate({
    where: whereInput,
    _min: {
      created_at: true,
    },
    _max: {
      created_at: true,
    },
  });
  const oldestReviewAt = dateResult._min.created_at
    ? toISOStringSafe(dateResult._min.created_at)
    : null;
  const newestReviewAt = dateResult._max.created_at
    ? toISOStringSafe(dateResult._max.created_at)
    : null;
  return {
    averageRating,
    totalCount: totalCount as number & tags.Type<"int32"> & tags.Minimum<0>,
    ratingDistribution: finalRatingDistribution,
    verifiedPurchaseCount: verifiedPurchaseCount as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    unverifiedPurchaseCount: unverifiedPurchaseCount as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    oldestReviewAt,
    newestReviewAt,
  } satisfies IEcommerceMallProductReviewStat.ISummary;
}
