import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSaleReviewsAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleReviewsAnalytic";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdministratorAnalyticsSaleReviews(props: {
  administrator: AdministratorPayload;
}): Promise<IShoppingMallSaleReviewsAnalytic> {
  const totalCountResult =
    await MyGlobal.prisma.shopping_mall_sale_reviews.count({
      where: { deleted_at: null },
    });
  const aggregateResult =
    await MyGlobal.prisma.shopping_mall_sale_reviews.aggregate({
      _avg: { rating: true },
      _min: { rating: true },
      _max: { rating: true },
      where: { deleted_at: null },
    });
  const starRatingGroup =
    await MyGlobal.prisma.shopping_mall_sale_reviews.groupBy({
      by: ["rating"],
      _count: { rating: true },
      where: { deleted_at: null },
    });
  const starRatingCounts: Record<"1" | "2" | "3" | "4" | "5", number> = {
    "1": 0,
    "2": 0,
    "3": 0,
    "4": 0,
    "5": 0,
  };
  for (const group of starRatingGroup) {
    if (
      group.rating !== null &&
      group.rating >= 1 &&
      group.rating <= 5 &&
      group._count !== undefined &&
      typeof group._count.rating === "number"
    ) {
      const key = group.rating.toString() as "1" | "2" | "3" | "4" | "5";
      starRatingCounts[key] = group._count.rating;
    }
  }
  return {
    totalCount: totalCountResult,
    averageRating: aggregateResult._avg?.rating ?? 0,
    minimumRating: aggregateResult._min?.rating ?? 0,
    maximumRating: aggregateResult._max?.rating ?? 0,
    starRatingCounts: starRatingCounts,
  };
}
