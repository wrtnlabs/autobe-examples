import { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdminProductsProductIdReviewStats(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallProductReviewStat> {
  // Verify product exists
  await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
    where: { id: props.productId },
  });
  // Get aggregate statistics for non-deleted reviews
  const aggregateResult =
    await MyGlobal.prisma.ecommerce_mall_reviews.aggregate({
      where: {
        product_id: props.productId,
        deleted_at: null,
      },
      _avg: {
        rating: true,
      },
      _count: {
        _all: true,
      },
    });
  // Get rating distribution grouped by rating value
  const distributionResult =
    await MyGlobal.prisma.ecommerce_mall_reviews.groupBy({
      by: ["rating"],
      where: {
        product_id: props.productId,
        deleted_at: null,
      },
      _count: {
        rating: true,
      },
    });
  // Build distribution map with default 0 values
  const distribution: {
    "1": number;
    "2": number;
    "3": number;
    "4": number;
    "5": number;
  } = {
    "1": 0,
    "2": 0,
    "3": 0,
    "4": 0,
    "5": 0,
  };
  for (const item of distributionResult) {
    const ratingKey = String(item.rating) as "1" | "2" | "3" | "4" | "5";
    distribution[ratingKey] = item._count.rating;
  }
  const totalCount = aggregateResult._count._all;
  const averageRating = aggregateResult._avg.rating ?? 0;
  return {
    averageRating: Math.round(averageRating * 10) / 10,
    totalCount,
    distribution: {
      "1": distribution["1"],
      "2": distribution["2"],
      "3": distribution["3"],
      "4": distribution["4"],
      "5": distribution["5"],
    },
  };
}
