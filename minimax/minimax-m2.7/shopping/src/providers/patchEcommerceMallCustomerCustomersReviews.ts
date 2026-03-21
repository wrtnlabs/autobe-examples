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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallReviewAtSummaryTransformer } from "../transformers/EcommerceMallReviewAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerCustomersReviews(props: {
  customer: CustomerPayload;
  body: IEcommerceMallReview.IRequest;
}): Promise<IPageIEcommerceMallReview.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  // Build rating range filter
  const ratingFilter =
    props.body.ratingMin !== undefined || props.body.ratingMax !== undefined
      ? {
          gte: props.body.ratingMin,
          lte: props.body.ratingMax,
        }
      : undefined;
  // Build date range filter
  const dateFilter =
    props.body.createdAfter !== undefined ||
    props.body.createdBefore !== undefined
      ? {
          gte:
            props.body.createdAfter !== undefined
              ? new Date(props.body.createdAfter)
              : undefined,
          lte:
            props.body.createdBefore !== undefined
              ? new Date(props.body.createdBefore)
              : undefined,
        }
      : undefined;
  // Build content filter
  const contentFilter =
    props.body.hasContent === true
      ? { not: null }
      : props.body.hasContent === false
        ? null
        : undefined;
  // Build dynamic where clause
  const whereInput = {
    ecommerce_mall_customer_id: props.customer.id,
    deleted_at: null,
    ...(props.body.productId && {
      ecommerce_mall_product_id: props.body.productId,
    }),
    ...(ratingFilter && { rating: ratingFilter }),
    ...(dateFilter && { created_at: dateFilter }),
    ...(props.body.contentSearch && {
      content: { contains: props.body.contentSearch },
    }),
    ...(contentFilter !== undefined && { content: contentFilter }),
  } satisfies Prisma.ecommerce_mall_reviewsWhereInput;
  // Determine sort order
  const orderByInput = (
    props.body.sortBy === "oldest"
      ? { created_at: "asc" as const }
      : props.body.sortBy === "rating_high"
        ? { rating: "desc" as const }
        : props.body.sortBy === "rating_low"
          ? { rating: "asc" as const }
          : { created_at: "desc" as const }
  ) satisfies Prisma.ecommerce_mall_reviewsOrderByWithRelationInput;
  // Query reviews with Transformer select
  const data = await MyGlobal.prisma.ecommerce_mall_reviews.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...EcommerceMallReviewAtSummaryTransformer.select(),
  });
  // Count total records
  const total = await MyGlobal.prisma.ecommerce_mall_reviews.count({
    where: whereInput,
  });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
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
