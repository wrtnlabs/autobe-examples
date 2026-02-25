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

export async function putShoppingMallCustomerSalesSaleIdReviewsReviewId(props: {
  customer: CustomerPayload;
  saleId: string & tags.Format<"uuid">;
  reviewId: string & tags.Format<"uuid">;
  body: IShoppingMallSaleReview.IUpdate;
}): Promise<IShoppingMallSaleReview.IUpdate> {
  // Find the review with matching reviewId and saleId
  const review =
    await MyGlobal.prisma.shopping_mall_sale_reviews.findUniqueOrThrow({
      where: { id: props.reviewId },
      select: {
        id: true,
        shopping_mall_sale_id: true,
        shopping_mall_customer_id: true,
        rating: true,
        body: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (review.shopping_mall_sale_id !== props.saleId) {
    throw new HttpException("Review does not belong to this sale", 403);
  }
  if (review.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.shopping_mall_sale_reviews.update({
    where: { id: props.reviewId },
    data: {
      rating: props.body.rating,
      body: props.body.body ?? null,
      updated_at: new Date(),
    },
  });
  // Because return type IUpdate likely only includes rating and body, omit date fields to match type
  return {
    rating: props.body.rating,
    body: props.body.body ?? undefined,
  };
}
