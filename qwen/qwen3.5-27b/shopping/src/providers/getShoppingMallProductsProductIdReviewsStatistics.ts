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
  const reviews = await MyGlobal.prisma.shopping_mall_reviews.findMany({
    where: {
      deleted_at: null,
      orderItem: {
        product_snapshot: {
          contains: props.productId,
        },
      },
    },
    select: {
      rating: true,
    },
  });
  const totalCount = reviews.length;
  if (totalCount === 0) {
    return {
      totalCount: 0,
      averageRating: null,
      ratingDistribution: {
        "1": 0,
        "2": 0,
        "3": 0,
        "4": 0,
        "5": 0,
      },
    };
  }
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  const averageRating = Math.round((sum / totalCount) * 10) / 10;
  const ratingDistribution = {
    "1": reviews.filter((r) => r.rating === 1).length,
    "2": reviews.filter((r) => r.rating === 2).length,
    "3": reviews.filter((r) => r.rating === 3).length,
    "4": reviews.filter((r) => r.rating === 4).length,
    "5": reviews.filter((r) => r.rating === 5).length,
  };
  return {
    totalCount,
    averageRating,
    ratingDistribution,
  };
}
