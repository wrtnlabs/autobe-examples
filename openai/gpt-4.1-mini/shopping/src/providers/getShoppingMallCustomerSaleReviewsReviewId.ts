import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSaleReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleReview";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerSaleReviewsReviewId(props: {
  customer: CustomerPayload;
  reviewId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSaleReview> {
  const review = await MyGlobal.prisma.shopping_mall_sale_reviews.findUnique({
    where: { id: props.reviewId },
    select: {
      id: true,
      rating: true,
      body: true,
      created_at: true,
      updated_at: true,
      shopping_mall_sale_id: true,
      shopping_mall_customer_id: true,
      deleted_at: true,
    },
  });
  if (!review || review.deleted_at !== null) {
    throw new HttpException("Sale review not found", 404);
  }
  if (review.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  return {
    id: review.id,
    star: review.rating,
    content: review.body === null ? null : review.body,
    created_at: toISOStringSafe(review.created_at),
    updated_at: toISOStringSafe(review.updated_at),
    sale_id: review.shopping_mall_sale_id,
    customer_id: review.shopping_mall_customer_id,
  };
}
