import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallReview";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallReviewAtSummaryTransformer } from "../transformers/EcommerceMallReviewAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallProductsProductIdReviews(props: {
  productId: string & tags.Format<"uuid">;
}): Promise<IPageIEcommerceMallReview.ISummary> {
  // Verify product exists - if product does not exist, return empty result set
  await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
    where: { id: props.productId },
    select: { id: true },
  });
  // Default pagination values
  const page = 1;
  const limit = 10;
  const skip = (page - 1) * limit;
  // Query non-deleted reviews for this product, sorted by newest first
  const reviews = await MyGlobal.prisma.ecommerce_mall_reviews.findMany({
    where: {
      ecommerce_mall_product_id: props.productId,
      deleted_at: null,
    },
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...EcommerceMallReviewAtSummaryTransformer.select(),
  });
  // Count total reviews for pagination metadata
  const total = await MyGlobal.prisma.ecommerce_mall_reviews.count({
    where: {
      ecommerce_mall_product_id: props.productId,
      deleted_at: null,
    },
  });
  // Transform reviews and build response
  const data = await ArrayUtil.asyncMap(
    reviews,
    EcommerceMallReviewAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data,
  };
}
