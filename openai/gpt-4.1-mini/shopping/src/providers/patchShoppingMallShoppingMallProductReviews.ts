import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import { IPageIShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductReview";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchShoppingMallShoppingMallProductReviews(props: {
  body: IShoppingMallProductReview.IRequest;
}): Promise<IPageIShoppingMallProductReview.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const whereCondition = {
    deleted_at: null as null,
    ...(props.body.rating !== undefined ? { rating: props.body.rating } : {}),
    ...(props.body.moderation_status !== undefined
      ? { moderation_status: props.body.moderation_status }
      : {}),
    ...(props.body.search_text
      ? {
          OR: [
            { title: { contains: props.body.search_text } },
            { body: { contains: props.body.search_text } },
          ],
        }
      : {}),
  };

  const [reviews, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_product_reviews.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.shopping_mall_product_reviews.count({
      where: whereCondition,
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: reviews.map((review) => ({
      id: review.id,
      shopping_mall_product_id: review.shopping_mall_product_id,
      shopping_mall_customer_id: review.shopping_mall_customer_id,
      rating: review.rating,
      title: review.title,
      body: review.body,
      moderation_status: review.moderation_status,
      created_at: toISOStringSafe(review.created_at),
      updated_at: toISOStringSafe(review.updated_at),
      deleted_at: review.deleted_at ? toISOStringSafe(review.deleted_at) : null,
    })),
  };
}
