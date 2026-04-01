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
  const whereBase: Prisma.ecommerce_mall_reviewsWhereInput = {
    product_id: props.productId,
    deleted_at: null,
  };
  const whereFilters: Prisma.ecommerce_mall_reviewsWhereInput = {
    ...whereBase,
    ...(props.body.is_verified_purchase !== undefined &&
    props.body.is_verified_purchase !== null
      ? { is_verified_purchase: props.body.is_verified_purchase }
      : {}),
    ...(props.body.rating_min !== undefined && props.body.rating_min !== null
      ? { rating: { gte: props.body.rating_min } }
      : {}),
    ...(props.body.rating_max !== undefined && props.body.rating_max !== null
      ? { rating: { lte: props.body.rating_max } }
      : {}),
    ...(props.body.created_at_after !== undefined &&
    props.body.created_at_after !== null
      ? { created_at: { gt: props.body.created_at_after } }
      : {}),
    ...(props.body.created_at_before !== undefined &&
    props.body.created_at_before !== null
      ? { created_at: { lt: props.body.created_at_before } }
      : {}),
  } satisfies Prisma.ecommerce_mall_reviewsWhereInput;
  const [
    reviewStats,
    totalCount,
    ratingDistribution,
    verifiedCount,
    unverifiedCount,
  ] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_reviews.aggregate({
      where: whereFilters,
      _avg: { rating: true },
      _count: { id: true },
      _min: { created_at: true },
      _max: { created_at: true },
    }),
    MyGlobal.prisma.ecommerce_mall_reviews.count({ where: whereFilters }),
    MyGlobal.prisma.ecommerce_mall_reviews.groupBy({
      where: whereFilters,
      by: ["rating"],
      _count: { id: true },
    }),
    MyGlobal.prisma.ecommerce_mall_reviews.count({
      where: { ...whereFilters, is_verified_purchase: true },
    }),
    MyGlobal.prisma.ecommerce_mall_reviews.count({
      where: { ...whereFilters, is_verified_purchase: false },
    }),
  ]);
  const ratingMap: Record<
    string,
    number & tags.Type<"int32"> & tags.Minimum<0>
  > = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  } satisfies Record<string, number & tags.Type<"int32"> & tags.Minimum<0>>;
  for (const dist of ratingDistribution) {
    ratingMap[String(dist.rating)] = dist._count.id;
  }
  const averageRatingValue: number =
    reviewStats._avg.rating !== null && reviewStats._avg.rating !== undefined
      ? reviewStats._avg.rating
      : 0;
  const oldestReviewAtValue: (string & tags.Format<"date-time">) | null =
    reviewStats._min.created_at !== null &&
    reviewStats._min.created_at !== undefined
      ? reviewStats._min.created_at.toISOString()
      : null;
  const newestReviewAtValue: (string & tags.Format<"date-time">) | null =
    reviewStats._max.created_at !== null &&
    reviewStats._max.created_at !== undefined
      ? reviewStats._max.created_at.toISOString()
      : null;
  return {
    averageRating: averageRatingValue,
    totalCount: totalCount,
    ratingDistribution: ratingMap,
    verifiedPurchaseCount: verifiedCount,
    unverifiedPurchaseCount: unverifiedCount,
    oldestReviewAt: oldestReviewAtValue,
    newestReviewAt: newestReviewAtValue,
  } satisfies IEcommerceMallProductReviewStat.ISummary;
}
