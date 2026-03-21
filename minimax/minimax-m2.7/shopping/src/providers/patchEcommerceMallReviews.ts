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

export async function patchEcommerceMallReviews(props: {
  body: IEcommerceMallReview.IRequest;
}): Promise<IPageIEcommerceMallReview.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 10, 100);
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    ...(props.body.productId && {
      ecommerce_mall_product_id: props.body.productId,
    }),
    ...(props.body.customerId && {
      ecommerce_mall_customer_id: props.body.customerId,
    }),
    ...(props.body.ratingMin !== undefined && {
      rating: { gte: props.body.ratingMin },
    }),
    ...(props.body.ratingMax !== undefined && {
      rating: { lte: props.body.ratingMax },
    }),
    ...(props.body.createdAfter && {
      created_at: { gte: new Date(props.body.createdAfter) },
    }),
    ...(props.body.createdBefore && {
      created_at: { lte: new Date(props.body.createdBefore) },
    }),
    ...(props.body.contentSearch && {
      content: {
        contains: props.body.contentSearch,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.hasContent === true && { content: { not: null } }),
    ...(props.body.hasContent === false && { content: null }),
  } satisfies Prisma.ecommerce_mall_reviewsWhereInput;
  const orderByInput = (
    props.body.sortBy === "oldest"
      ? { created_at: "asc" as const }
      : props.body.sortBy === "rating_high"
        ? { rating: "desc" as const }
        : props.body.sortBy === "rating_low"
          ? { rating: "asc" as const }
          : { created_at: "desc" as const }
  ) satisfies Prisma.ecommerce_mall_reviewsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.ecommerce_mall_reviews.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...EcommerceMallReviewAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_reviews.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallReviewAtSummaryTransformer.transform,
    ),
  };
}
