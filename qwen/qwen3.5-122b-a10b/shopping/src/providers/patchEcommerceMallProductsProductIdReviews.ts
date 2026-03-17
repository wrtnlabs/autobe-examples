import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
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
  // Validate product exists
  await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
    where: { id: props.productId },
  });
  // Build where clause with proper date range handling
  const whereInput: Prisma.ecommerce_mall_reviewsWhereInput = {
    product_id: props.productId,
    ...(props.body.isDeleted !== undefined && {
      is_deleted: props.body.isDeleted,
    }),
    ...(props.body.rating !== undefined && {
      rating: props.body.rating,
    }),
    ...(props.body.startDate !== undefined || props.body.endDate !== undefined
      ? {
          created_at: {
            ...(props.body.startDate !== undefined && {
              gte: new Date(props.body.startDate),
            }),
            ...(props.body.endDate !== undefined && {
              lte: new Date(props.body.endDate),
            }),
          },
        }
      : {}),
  } satisfies Prisma.ecommerce_mall_reviewsWhereInput;
  // Pagination
  const page = props.body.page ?? 1;
  const pageSize = props.body.pageSize ?? 20;
  const skip = (page - 1) * pageSize;
  // Sorting
  const sortBy = props.body.sortBy ?? "created_at";
  const sortOrder = props.body.sortOrder ?? "desc";
  const orderByInput: Prisma.ecommerce_mall_reviewsOrderByWithRelationInput =
    sortBy === "rating" ? { rating: sortOrder } : { created_at: sortOrder };
  // Fetch reviews with customer join
  const reviews = await MyGlobal.prisma.ecommerce_mall_reviews.findMany({
    where: whereInput,
    skip,
    take: pageSize,
    orderBy: orderByInput,
    ...EcommerceMallReviewAtSummaryTransformer.select(),
  });
  // Count total records
  const total = await MyGlobal.prisma.ecommerce_mall_reviews.count({
    where: whereInput,
  });
  // Transform results
  const data = await Promise.all(
    reviews.map((review) =>
      EcommerceMallReviewAtSummaryTransformer.transform(review),
    ),
  );
  return {
    pagination: {
      current: page,
      limit: pageSize,
      records: total,
      pages: Math.ceil(total / pageSize),
    } satisfies IPage.IPagination,
    data,
  } satisfies IPageIEcommerceMallReview.ISummary;
}
