import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
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
  // Validate product exists
  await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
    where: { id: props.productId },
  });
  // Extract pagination with defaults
  const page = props.body.page ?? 1;
  const pageSize = props.body.pageSize ?? 20;
  const limit = props.body.limit ?? pageSize;
  const validatedLimit = Math.min(Math.max(1, limit), 100);
  const skip = (page - 1) * validatedLimit;
  // Build WHERE clause
  const whereInput: Prisma.ecommerce_mall_reviewsWhereInput = {
    product_id: props.productId,
    is_active: true,
    deleted_at: null,
    ...(props.body.ratingMin !== undefined && {
      rating: { gte: props.body.ratingMin },
    }),
    ...(props.body.ratingMax !== undefined && {
      rating: { lte: props.body.ratingMax },
    }),
    ...(props.body.createdAtFrom !== undefined && {
      created_at: { gte: props.body.createdAtFrom },
    }),
    ...(props.body.createdAtTo !== undefined && {
      created_at: { lte: props.body.createdAtTo },
    }),
    ...(props.body.searchText !== undefined && {
      text_content: { contains: props.body.searchText, mode: "insensitive" },
    }),
  } satisfies Prisma.ecommerce_mall_reviewsWhereInput;
  // Build ORDERBY with validation
  const orderByInput: Prisma.ecommerce_mall_reviewsOrderByWithRelationInput = {
    created_at: (props.body.sortOrder ?? "desc") as "asc" | "desc",
  } satisfies Prisma.ecommerce_mall_reviewsOrderByWithRelationInput;
  // Query reviews with customer and product joins
  const reviews = await MyGlobal.prisma.ecommerce_mall_reviews.findMany({
    where: whereInput,
    skip,
    take: validatedLimit,
    orderBy: orderByInput,
    ...EcommerceMallReviewAtSummaryTransformer.select(),
  });
  // Query total count
  const total = await MyGlobal.prisma.ecommerce_mall_reviews.count({
    where: whereInput,
  });
  // Calculate average rating
  const averageRatingResult =
    await MyGlobal.prisma.ecommerce_mall_reviews.aggregate({
      where: {
        product_id: props.productId,
        is_active: true,
        deleted_at: null,
      },
      _avg: { rating: true },
    });
  const averageRating =
    averageRatingResult._avg.rating !== null
      ? averageRatingResult._avg.rating
      : undefined;
  // Transform review list
  const data = await ArrayUtil.asyncMap(
    reviews,
    EcommerceMallReviewAtSummaryTransformer.transform,
  );
  return {
    data,
    pagination: {
      current: page,
      limit: validatedLimit,
      records: total,
      pages: total > 0 ? Math.ceil(total / validatedLimit) : 0,
    },
    average_rating: averageRating,
  } as IPageIEcommerceMallReview.ISummary;
}
