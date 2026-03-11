import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallReviewAtSummaryTransformer } from "../transformers/ShoppingMallReviewAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallReviews(props: {
  body: IShoppingMallReview.IRequest;
}): Promise<IPageIShoppingMallReview.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build WHERE clause with all filters
  const whereInput = {
    // Rating filter - exact match takes precedence over range
    ...(props.body.rating !== undefined
      ? { rating: props.body.rating }
      : props.body.ratingMin !== undefined || props.body.ratingMax !== undefined
        ? {
            rating: {
              ...(props.body.ratingMin !== undefined && {
                gte: props.body.ratingMin,
              }),
              ...(props.body.ratingMax !== undefined && {
                lte: props.body.ratingMax,
              }),
            },
          }
        : {}),
    // Customer filter
    ...(props.body.shopping_mall_customer_id && {
      shopping_mall_customer_id: props.body.shopping_mall_customer_id,
    }),
    // Product filter
    ...(props.body.shopping_mall_product_id && {
      shopping_mall_product_id: props.body.shopping_mall_product_id,
    }),
    // Date range filter - handle both from and to
    ...(props.body.createdFrom !== undefined ||
    props.body.createdTo !== undefined
      ? {
          created_at: {
            ...(props.body.createdFrom !== undefined && {
              gte: new Date(props.body.createdFrom),
            }),
            ...(props.body.createdTo !== undefined && {
              lte: new Date(props.body.createdTo),
            }),
          },
        }
      : {}),
    // Soft delete filter - default excludes deleted, includeDeleted shows all
    ...(props.body.includeDeleted === true ? {} : { deleted_at: null }),
    // Full-text search on content
    ...(props.body.search && props.body.search.trim().length > 0
      ? {
          content: {
            contains: props.body.search,
            mode: "insensitive" as const,
          },
        }
      : {}),
  } satisfies Prisma.shopping_mall_reviewsWhereInput;
  // Query reviews with pagination and sorting
  const reviews = await MyGlobal.prisma.shopping_mall_reviews.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: [{ created_at: "desc" as const }, { id: "desc" as const }],
    ...ShoppingMallReviewAtSummaryTransformer.select(),
  });
  // Count total for pagination
  const total = await MyGlobal.prisma.shopping_mall_reviews.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      reviews,
      ShoppingMallReviewAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
