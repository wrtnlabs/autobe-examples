import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductReviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistic";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallProductsProductIdReviewsStatistics(props: {
  productId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductReviewStatistic> {
  const ratingGroups = await MyGlobal.prisma.shopping_mall_reviews.groupBy({
    by: ["rating"],
    where: {
      shopping_product_id: props.productId,
      deleted: false,
    },
    _count: {
      rating: true,
    },
  });
  const ratingDistribution = {
    "1": 0,
    "2": 0,
    "3": 0,
    "4": 0,
    "5": 0,
  } as IShoppingMallProductReviewStatistic["ratingDistribution"];
  let totalRating = 0;
  let totalReviewCount = 0;
  for (const group of ratingGroups) {
    const count = group._count.rating;
    totalRating += group.rating * count;
    totalReviewCount += count;
    ratingDistribution[group.rating.toString() as "1" | "2" | "3" | "4" | "5"] =
      count;
  }
  const averageRating =
    totalReviewCount === 0
      ? null
      : ((totalRating / totalReviewCount) as number &
          tags.Minimum<1> &
          tags.Maximum<5>);
  return {
    averageRating,
    totalReviewCount,
    ratingDistribution,
  } satisfies IShoppingMallProductReviewStatistic;
}
