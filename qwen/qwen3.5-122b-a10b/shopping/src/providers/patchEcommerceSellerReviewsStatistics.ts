import { IEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReview";
import { IEcommerceReviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReviewStatistic";
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

export async function patchEcommerceSellerReviewsStatistics(props: {
  seller: SellerPayload;
  body: IEcommerceReview.IRequest;
}): Promise<IEcommerceReviewStatistic> {
  // Build where clause for non-deleted reviews
  const whereInput: Prisma.ecommerce_reviewsWhereInput = {
    deleted_at: null,
    ...(props.body.product_id && { product_id: props.body.product_id }),
  };
  // Get aggregate statistics: average rating and total count
  const aggregate = await MyGlobal.prisma.ecommerce_reviews.aggregate({
    where: whereInput,
    _avg: { rating: true },
    _count: true,
  });
  // Get rating distribution using groupBy
  const distributionData = await MyGlobal.prisma.ecommerce_reviews.groupBy({
    by: ["rating"],
    where: whereInput,
    _count: { rating: true },
  });
  // Build distribution object with keys "1" through "5", defaulting to 0
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
  for (const item of distributionData) {
    if (item.rating === 1) distribution["1"] = item._count.rating;
    else if (item.rating === 2) distribution["2"] = item._count.rating;
    else if (item.rating === 3) distribution["3"] = item._count.rating;
    else if (item.rating === 4) distribution["4"] = item._count.rating;
    else if (item.rating === 5) distribution["5"] = item._count.rating;
  }
  // Calculate average rating (handle case where no reviews exist)
  const averageRating = aggregate._avg.rating ?? 0;
  return {
    average_rating: averageRating,
    total_count: aggregate._count,
    distribution,
  };
}
