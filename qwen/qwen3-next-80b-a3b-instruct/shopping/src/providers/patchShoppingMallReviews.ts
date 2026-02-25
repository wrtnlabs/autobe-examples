import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchShoppingMallReviews(props: {
  body: IShoppingMallReview.IRequest;
}): Promise<IPageIShoppingMallReview.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 50;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.shopping_mall_reviewsWhereInput = {
    is_deleted: false,
    rating: props.body.rating_range
      ? {
          gte: props.body.rating_range.min,
          lte: props.body.rating_range.max,
        }
      : {
          gte: 1,
        },
    ...(props.body.product_id && { product_id: props.body.product_id }),
    ...(props.body.customer_id && { customer_id: props.body.customer_id }),
    ...(props.body.created_at_range && {
      created_at: {
        gte: props.body.created_at_range.start,
        lte: props.body.created_at_range.end,
      },
    }),
  } satisfies Prisma.shopping_mall_reviewsWhereInput;
  const orderByInput =
    props.body.sort === "oldest"
      ? { created_at: "asc" as const }
      : ({
          created_at: "desc" as const,
        } satisfies Prisma.shopping_mall_reviewsOrderByWithRelationInput);
  const data = await MyGlobal.prisma.shopping_mall_reviews.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    select: {
      id: true,
      rating: true,
      content: true,
      created_at: true,
      updated_at: true,
      is_deleted: true,
    },
  });
  const total = await MyGlobal.prisma.shopping_mall_reviews.count({
    where: whereInput,
  });
  const mappedData = await ArrayUtil.asyncMap(data, (review) => {
    const item = {
      id: review.id,
      rating: review.rating,
      content: review.content === null ? undefined : review.content,
      created_at: toISOStringSafe(review.created_at),
      updated_at: toISOStringSafe(review.updated_at),
      is_deleted: review.is_deleted,
    };
    typia.assertGuard<IShoppingMallReview.ISummary>(item);
    return item;
  });
  return {
    data: mappedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
