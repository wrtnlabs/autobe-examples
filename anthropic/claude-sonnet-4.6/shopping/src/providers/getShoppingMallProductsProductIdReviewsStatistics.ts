import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallReviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewStatistic";
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
}): Promise<IShoppingMallReviewStatistic> {
  // Step 1: Validate product exists and is not deleted
  await MyGlobal.prisma.shopping_mall_products.findFirstOrThrow({
    where: {
      id: props.productId,
      deleted_at: null,
    },
    select: { id: true },
  });
  // Step 2: Aggregate reviews (count + avg rating) in one query
  const aggregate = await MyGlobal.prisma.shopping_mall_reviews.aggregate({
    where: {
      product_id: props.productId,
      deleted_at: null,
    },
    _count: { _all: true },
    _avg: { rating: true },
  });
  const review_count = aggregate._count._all;
  const raw_avg =
    review_count > 0 && aggregate._avg.rating !== null
      ? Math.round(aggregate._avg.rating * 100) / 100
      : null;
  return {
    product_id: props.productId,
    average_rating: raw_avg,
    review_count,
  } satisfies IShoppingMallReviewStatistic;
}
