import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import { IPageIShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductReview";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminProductReviews(props: {
  admin: AdminPayload;
  body: IShoppingMallProductReview.IRequest;
}): Promise<IPageIShoppingMallProductReview.ISummary> {
  const { admin, body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> as number;
  const limit = (body.limit ?? 20) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> as number;
  const skip = (page - 1) * limit;

  const where = {
    deleted_at: null,
    ...(body.filterRating !== undefined &&
      body.filterRating !== null && {
        rating: body.filterRating,
      }),
    ...(body.filterStatus !== undefined &&
      body.filterStatus !== null && {
        status: body.filterStatus,
      }),
    ...(body.filterProductId !== undefined &&
      body.filterProductId !== null && {
        shopping_mall_product_id: body.filterProductId,
      }),
    ...(body.filterCustomerId !== undefined &&
      body.filterCustomerId !== null && {
        shopping_mall_customer_id: body.filterCustomerId,
      }),
    ...(body.search !== undefined &&
      body.search !== null && {
        review_text: {
          contains: body.search,
        },
      }),
  };

  const [reviews, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_product_reviews.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        shopping_mall_customer_id: true,
        shopping_mall_product_id: true,
        shopping_mall_order_id: true,
        rating: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_product_reviews.count({ where }),
  ]);

  const data = reviews.map((item) => ({
    id: item.id,
    shopping_mall_customer_id: item.shopping_mall_customer_id,
    shopping_mall_product_id: item.shopping_mall_product_id,
    shopping_mall_order_id: item.shopping_mall_order_id,
    rating: item.rating,
    status: item.status,
    created_at: toISOStringSafe(item.created_at),
    updated_at: toISOStringSafe(item.updated_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
