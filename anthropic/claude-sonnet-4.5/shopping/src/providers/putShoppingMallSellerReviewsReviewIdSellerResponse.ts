import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallReviewSellerResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSellerResponse";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingMallSellerReviewsReviewIdSellerResponse(props: {
  seller: SellerPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IShoppingMallReviewSellerResponse.ICreate;
}): Promise<IShoppingMallReviewSellerResponse> {
  const review = await MyGlobal.prisma.shopping_mall_reviews.findFirst({
    where: {
      id: props.reviewId,
      deleted_at: null,
    },
    include: {
      sale: true,
    },
  });

  if (!review) {
    throw new HttpException("Review not found", 404);
  }

  if (review.sale.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException(
      "You can only respond to reviews on your own products",
      403,
    );
  }

  const now = new Date();
  const response =
    await MyGlobal.prisma.shopping_mall_review_seller_responses.upsert({
      where: {
        shopping_mall_review_id: props.reviewId,
      },
      create: {
        id: v4(),
        shopping_mall_review_id: props.reviewId,
        shopping_mall_seller_id: props.seller.id,
        response_body: props.body.response_body,
        status: "pending_moderation",
        created_at: now,
        updated_at: now,
      },
      update: {
        response_body: props.body.response_body,
        updated_at: now,
      },
    });

  return {
    id: response.id,
    shopping_mall_review_id: response.shopping_mall_review_id,
    shopping_mall_seller_id: response.shopping_mall_seller_id,
    response_body: response.response_body,
    status: response.status,
    created_at: toISOStringSafe(response.created_at),
    updated_at: toISOStringSafe(response.updated_at),
    deleted_at:
      response.deleted_at === null
        ? undefined
        : toISOStringSafe(response.deleted_at),
  };
}
