import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
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

export async function patchShoppingMallProductsProductIdReviews(props: {
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallReview.IRequest;
}): Promise<IPageIShoppingMallReview.ISummary> {
  // 1. Validate product exists and is not deleted
  await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
    where: { id: props.productId, deleted_at: null },
    select: { id: true },
  });
  // 2. Pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // 3. Sort parameters
  const sortBy = props.body.sortBy ?? "updated_at";
  const sortOrder = props.body.sortOrder ?? "desc";
  // 4. Build WHERE clause
  const whereInput = {
    product_id: props.productId,
    deleted_at: null,
    ...(props.body.customerId != null && {
      customer_id: props.body.customerId,
    }),
    ...(props.body.minRating != null || props.body.maxRating != null
      ? {
          rating: {
            ...(props.body.minRating != null && { gte: props.body.minRating }),
            ...(props.body.maxRating != null && { lte: props.body.maxRating }),
          },
        }
      : {}),
    ...(props.body.body != null && {
      body: { contains: props.body.body, mode: "insensitive" as const },
    }),
    ...(props.body.createdAtFrom != null || props.body.createdAtTo != null
      ? {
          created_at: {
            ...(props.body.createdAtFrom != null && {
              gte: new Date(props.body.createdAtFrom),
            }),
            ...(props.body.createdAtTo != null && {
              lte: new Date(props.body.createdAtTo),
            }),
          },
        }
      : {}),
    ...(props.body.updatedAtFrom != null || props.body.updatedAtTo != null
      ? {
          updated_at: {
            ...(props.body.updatedAtFrom != null && {
              gte: new Date(props.body.updatedAtFrom),
            }),
            ...(props.body.updatedAtTo != null && {
              lte: new Date(props.body.updatedAtTo),
            }),
          },
        }
      : {}),
  } satisfies Prisma.shopping_mall_reviewsWhereInput;
  // 5. Build ORDER BY clause
  const orderByInput = (
    sortBy === "rating"
      ? { rating: sortOrder as "asc" | "desc" }
      : sortBy === "created_at"
        ? { created_at: sortOrder as "asc" | "desc" }
        : { updated_at: sortOrder as "asc" | "desc" }
  ) satisfies Prisma.shopping_mall_reviewsOrderByWithRelationInput;
  // 6. Query reviews and count sequentially
  const data = await MyGlobal.prisma.shopping_mall_reviews.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ShoppingMallReviewAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_reviews.count({
    where: whereInput,
  });
  // 7. Transform results
  const transformed = await ArrayUtil.asyncMap(
    data,
    ShoppingMallReviewAtSummaryTransformer.transform,
  );
  // 8. Return paginated response
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformed,
  };
}
