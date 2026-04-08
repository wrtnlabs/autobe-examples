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

export async function getEcommerceMallCustomerProductsProductIdReviewStats(props: {
  customer: CustomerPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallProductReviewStat> {
  // Aggregate: average rating and total count
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
        rating: true,
      },
    });
  // Group by rating for distribution (1-5 stars)
  const groupByResult = await MyGlobal.prisma.ecommerce_mall_reviews.groupBy({
    by: ["rating"],
    where: {
      product_id: props.productId,
      deleted_at: null,
    },
    _count: {
      rating: true,
    },
  });
  // Build distribution object from groupBy result
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
  groupByResult.forEach((group) => {
    const rating = String(group.rating) as "1" | "2" | "3" | "4" | "5";
    if (rating in distribution) {
      distribution[rating] = group._count.rating ?? 0;
    }
  });
  // Calculate average rating rounded to 1 decimal place
  const avgRating = aggregateResult._avg.rating ?? 0;
  const roundedAvg = Math.round(avgRating * 10) / 10;
  return {
    averageRating: roundedAvg as number &
      tags.Minimum<0> &
      tags.Maximum<5> &
      tags.MultipleOf<0.1>,
    totalCount: aggregateResult._count.rating ?? 0,
    distribution: distribution as {
      "1": number & tags.Type<"int32"> & tags.Minimum<0>;
      "2": number & tags.Type<"int32"> & tags.Minimum<0>;
      "3": number & tags.Type<"int32"> & tags.Minimum<0>;
      "4": number & tags.Type<"int32"> & tags.Minimum<0>;
      "5": number & tags.Type<"int32"> & tags.Minimum<0>;
    },
  } satisfies IEcommerceMallProductReviewStat;
}
