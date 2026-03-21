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

export async function patchEcommerceMallProductsProductIdReviews(props: {
  productId: string & tags.Format<"uuid">;
  body: IEcommerceMallReview.IRequest;
}): Promise<IPageIEcommerceMallReview.ISummary> {
  // Pagination defaults (limit max: 100 per spec)
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 10, 100);
  const skip = (page - 1) * limit;
  // Build WHERE conditions
  const whereConditions: Prisma.ecommerce_mall_reviewsWhereInput = {
    ecommerce_mall_product_id: props.productId,
    deleted_at: null,
  };
  // Rating range filter
  if (
    props.body.ratingMin !== undefined ||
    props.body.ratingMax !== undefined
  ) {
    whereConditions.rating = {};
    if (props.body.ratingMin !== undefined) {
      whereConditions.rating.gte = props.body.ratingMin;
    }
    if (props.body.ratingMax !== undefined) {
      whereConditions.rating.lte = props.body.ratingMax;
    }
  }
  // Content search filter
  if (props.body.contentSearch !== undefined) {
    whereConditions.content = {
      contains: props.body.contentSearch,
      mode: "insensitive",
    };
  }
  // Date range filter
  if (
    props.body.createdAfter !== undefined ||
    props.body.createdBefore !== undefined
  ) {
    whereConditions.created_at = {};
    if (props.body.createdAfter !== undefined) {
      whereConditions.created_at.gte = new Date(props.body.createdAfter);
    }
    if (props.body.createdBefore !== undefined) {
      whereConditions.created_at.lte = new Date(props.body.createdBefore);
    }
  }
  // Has content filter
  if (props.body.hasContent === true) {
    whereConditions.content = { not: null };
  } else if (props.body.hasContent === false) {
    whereConditions.content = null;
  }
  // Sort order
  let orderBy: Prisma.ecommerce_mall_reviewsOrderByWithRelationInput;
  switch (props.body.sortBy) {
    case "oldest":
      orderBy = { created_at: "asc" };
      break;
    case "rating_high":
      orderBy = { rating: "desc" };
      break;
    case "rating_low":
      orderBy = { rating: "asc" };
      break;
    default:
      orderBy = { created_at: "desc" };
  }
  // Execute findMany query
  const reviews = await MyGlobal.prisma.ecommerce_mall_reviews.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy,
    ...EcommerceMallReviewAtSummaryTransformer.select(),
  });
  // Execute count query
  const total = await MyGlobal.prisma.ecommerce_mall_reviews.count({
    where: whereConditions,
  });
  // Build response
  const transformedData = await ArrayUtil.asyncMap(
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
    data: transformedData,
  };
}
