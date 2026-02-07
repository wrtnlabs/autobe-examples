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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdminAdminReviews(props: {
  admin: AdminPayload;
}): Promise<IPageIShoppingMallReview.ISummary> {
  const data = await MyGlobal.prisma.shopping_mall_reviews.findMany({
    select: {
      id: true,
      customer_id: true,
      order_item_id: true,
      rating: true,
      content: true,
    },
  });
  const total = await MyGlobal.prisma.shopping_mall_reviews.count();
  return {
    data: data.map((review) => ({
      id: review.id,
      customer_id: review.customer_id,
      order_item_id: review.order_item_id,
      rating: review.rating,
      content: review.content ?? undefined,
    })),
    pagination: {
      current: 1,
      limit: data.length,
      records: total,
      pages: 1,
    },
  };
}
