import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchShoppingMallReviews(props: {
  body: IShoppingMallReview.IRequest;
}): Promise<IPageIShoppingMallReview> {
  const { body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  const where = {
    ...(body.shopping_mall_product_id !== undefined && {
      shopping_mall_product_id: body.shopping_mall_product_id,
    }),
    ...(body.shopping_mall_customer_id !== undefined && {
      shopping_mall_customer_id: body.shopping_mall_customer_id,
    }),
    ...(body.rating !== undefined && {
      rating: body.rating,
    }),
    ...(body.status !== undefined && {
      status: body.status,
    }),
    ...(body.verified_purchase_only === true && {
      verified_purchase: true,
    }),
    ...(body.min_helpful_count !== undefined && {
      helpful_count: {
        gte: body.min_helpful_count,
      },
    }),
    ...((body.created_after !== undefined ||
      body.created_before !== undefined) && {
      created_at: {
        ...(body.created_after !== undefined && { gte: body.created_after }),
        ...(body.created_before !== undefined && { lte: body.created_before }),
      },
    }),
    deleted_at: null,
  };

  const orderBy = (() => {
    switch (body.sort_by) {
      case "most_helpful":
        return { helpful_count: "desc" as const };
      case "highest_rating":
        return { rating: "desc" as const };
      case "lowest_rating":
        return { rating: "asc" as const };
      case "most_recent":
      default:
        return { created_at: "desc" as const };
    }
  })();

  const [total, reviews] = await Promise.all([
    MyGlobal.prisma.shopping_mall_reviews.count({ where }),
    MyGlobal.prisma.shopping_mall_reviews.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
  ]);

  const data = reviews.map((review) => ({
    id: review.id,
    shopping_mall_customer_id: review.shopping_mall_customer_id,
    shopping_mall_product_id: review.shopping_mall_product_id,
    shopping_mall_sku_id:
      review.shopping_mall_sku_id === null
        ? undefined
        : review.shopping_mall_sku_id,
    shopping_mall_order_id: review.shopping_mall_order_id,
    rating: review.rating,
    title: review.title === null ? undefined : review.title,
    review_text: review.review_text === null ? undefined : review.review_text,
    verified_purchase: review.verified_purchase,
    status: review.status,
    helpful_count: review.helpful_count,
    not_helpful_count: review.not_helpful_count,
    created_at: toISOStringSafe(review.created_at),
    updated_at: toISOStringSafe(review.updated_at),
  }));

  const pages = Math.ceil(total / limit);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages,
    },
    data,
  };
}
