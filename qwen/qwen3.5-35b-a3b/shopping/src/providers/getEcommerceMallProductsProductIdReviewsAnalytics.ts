import { IEcommerceMallReviewAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReviewAnalytic";
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

export async function getEcommerceMallProductsProductIdReviewsAnalytics(props: {
  productId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallReviewAnalytic> {
  await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
    where: { id: props.productId },
  });
  const grouped = await MyGlobal.prisma.ecommerce_mall_reviews.groupBy({
    by: ["rating"],
    where: {
      product_id: props.productId,
      is_active: true,
      deleted_at: null,
    },
    _count: { id: true },
    _sum: { rating: true },
  });
  const ratingCounts: Record<number, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };
  let totalRatingSum = 0;
  let totalCount = 0;
  for (const group of grouped) {
    const rating = group.rating;
    const count = group._count.id;
    ratingCounts[rating] = count;
    totalRatingSum += rating * count;
    totalCount += count;
  }
  const averageRating =
    totalCount > 0 ? Number((totalRatingSum / totalCount).toFixed(1)) : null;
  return {
    average_rating: averageRating,
    total_count: totalCount as number & tags.Type<"int32"> & tags.Minimum<0>,
    rating_1_count: ratingCounts[1] as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    rating_2_count: ratingCounts[2] as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    rating_3_count: ratingCounts[3] as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    rating_4_count: ratingCounts[4] as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    rating_5_count: ratingCounts[5] as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
  };
}
