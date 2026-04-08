import { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallGuestProductsProductIdReviewStats(props: {
  guest: GuestPayload;
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
      _avg: { rating: true },
      _count: { id: true },
    });
  // Get distribution by rating
  const distributionResult =
    await MyGlobal.prisma.ecommerce_mall_reviews.groupBy({
      by: ["rating"],
      where: {
        product_id: props.productId,
        deleted_at: null,
      },
      _count: { rating: true },
    });
  // Initialize distribution with all zeros
  const dist1 = 0;
  const dist2 = 0;
  const dist3 = 0;
  const dist4 = 0;
  const dist5 = 0;
  // Build distribution map from query results
  const distributionMap: Record<number, number> = {};
  for (const item of distributionResult) {
    distributionMap[item.rating] =
      (item._count?.rating as number | undefined) ?? 0;
  }
  const averageRating =
    (aggregateResult._avg?.rating as number | null | undefined) ?? 0;
  const totalCount = (aggregateResult._count?.id as number | undefined) ?? 0;
  return {
    averageRating: Math.round(averageRating * 10) / 10,
    totalCount,
    distribution: {
      "1": distributionMap[1] ?? dist1,
      "2": distributionMap[2] ?? dist2,
      "3": distributionMap[3] ?? dist3,
      "4": distributionMap[4] ?? dist4,
      "5": distributionMap[5] ?? dist5,
    } satisfies IEcommerceMallProductReviewStat["distribution"],
  };
}
