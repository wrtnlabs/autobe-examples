import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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

export async function patchEcommerceMallProductsProductIdReviews(props: {
  productId: string & tags.Format<"uuid">;
  body: IEcommerceMallReview.IRequest;
}): Promise<IPageIEcommerceMallReview.ISummary> {
  // Verify product exists
  await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
    where: { id: props.productId },
  });
  // Build rating filter
  const ratingFilter: Prisma.IntFilter<"ecommerce_mall_reviews"> | undefined =
    props.body.minRating !== null || props.body.maxRating !== null
      ? {
          ...(props.body.minRating !== null && { gte: props.body.minRating }),
          ...(props.body.maxRating !== null && { lte: props.body.maxRating }),
        }
      : undefined;
  // Build where clause
  const where: Prisma.ecommerce_mall_reviewsWhereInput = {
    product_id: props.productId,
    ...(props.body.customerId !== null && {
      customer_id: props.body.customerId,
    }),
    ...(ratingFilter !== undefined && { rating: ratingFilter }),
    ...(props.body.createdAfter !== null && {
      created_at: { gt: new Date(props.body.createdAfter) },
    }),
    ...(props.body.createdBefore !== null && {
      created_at: { lt: new Date(props.body.createdBefore) },
    }),
    ...(props.body.search !== null && {
      content: { contains: props.body.search, mode: "insensitive" as const },
    }),
    ...(props.body.includeDeleted !== true && { deleted_at: null }),
  };
  // Determine sort order
  const orderBy: Prisma.ecommerce_mall_reviewsOrderByWithRelationInput =
    props.body.sort === "oldest"
      ? { created_at: "asc" }
      : props.body.sort === "highestRating"
        ? { rating: "desc" }
        : props.body.sort === "lowestRating"
          ? { rating: "asc" }
          : { created_at: "desc" };
  // Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Query reviews
  const reviews = await MyGlobal.prisma.ecommerce_mall_reviews.findMany({
    where,
    orderBy,
    skip,
    take: limit,
    ...EcommerceMallReviewAtSummaryTransformer.select(),
  });
  // Count total
  const total = await MyGlobal.prisma.ecommerce_mall_reviews.count({ where });
  // Transform results
  const transformedReviews = await ArrayUtil.asyncMap(
    reviews,
    EcommerceMallReviewAtSummaryTransformer.transform,
  );
  return {
    data: transformedReviews,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
