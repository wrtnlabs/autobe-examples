import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductReview";
import { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdministratorReviewsModeration(props: {
  administrator: AdministratorPayload;
}): Promise<IPageIShoppingMallProductReview.ISummary> {
  const page: number = 1;
  const limit: number = 20;
  const skip: number = (page - 1) * limit;
  const [reviews, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_reviews.findMany({
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        rating: true,
        body: true,
        created_at: true,
        deleted_at: true,
        customer_id: true,
        order_id: true,
        order_item_id: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_reviews.count(),
  ]);
  function toDateTimeString(
    value: Date | null,
  ): string & import("typia").tags.Format<"date-time"> {
    if (value === null)
      return "1970-01-01T00:00:00.000Z" as string &
        import("typia").tags.Format<"date-time">; // fallback, never used but typed
    return toISOStringSafe(value);
  }
  const data = reviews.map((review) => {
    const createdAt = toDateTimeString(review.created_at);
    const deletedAt =
      review.deleted_at === null ? null : toDateTimeString(review.deleted_at);
    return {
      id: review.id,
      rating: review.rating,
      content: review.body === null ? null : review.body,
      created_at: createdAt,
      deleted_at: deletedAt,
      customer_id: review.customer_id,
      order_id: review.order_id,
      order_item_id: review.order_item_id,
    };
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data: data,
  };
}
