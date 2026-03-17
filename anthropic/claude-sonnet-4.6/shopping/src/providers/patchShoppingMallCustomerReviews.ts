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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallReviewAtSummaryTransformer } from "../transformers/ShoppingMallReviewAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerReviews(props: {
  customer: CustomerPayload;
  body: IShoppingMallReview.IRequest;
}): Promise<IPageIShoppingMallReview.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sortBy: string = props.body.sortBy ?? "created_at";
  const sortOrder: "asc" | "desc" =
    props.body.sortOrder === "asc" ? "asc" : "desc";
  const orderByInput: Prisma.shopping_mall_reviewsOrderByWithRelationInput =
    sortBy === "updated_at"
      ? { updated_at: sortOrder }
      : sortBy === "rating"
        ? { rating: sortOrder }
        : { created_at: sortOrder };
  const whereInput = {
    deleted_at: null,
    ...(props.body.productId != null && {
      product_id: props.body.productId,
    }),
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
      body: {
        contains: props.body.body,
        mode: "insensitive" satisfies Prisma.QueryMode,
      },
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
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallReviewAtSummaryTransformer.transform,
    ),
  };
}
