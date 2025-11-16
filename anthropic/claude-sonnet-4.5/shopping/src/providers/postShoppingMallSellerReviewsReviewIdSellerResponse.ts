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

export async function postShoppingMallSellerReviewsReviewIdSellerResponse(props: {
  seller: SellerPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IShoppingMallReviewSellerResponse.ICreate;
}): Promise<IShoppingMallReviewSellerResponse> {
  const review = await MyGlobal.prisma.shopping_mall_reviews.findUnique({
    where: { id: props.reviewId },
    include: {
      sale: {
        select: {
          shopping_mall_seller_id: true,
        },
      },
    },
  });

  if (!review || review.deleted_at !== null) {
    throw new HttpException("Review not found", 404);
  }

  if (review.sale.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException(
      "You can only respond to reviews on your own products",
      403,
    );
  }

  const existingResponse =
    await MyGlobal.prisma.shopping_mall_review_seller_responses.findUnique({
      where: { shopping_mall_review_id: props.reviewId },
    });

  if (existingResponse && existingResponse.deleted_at === null) {
    throw new HttpException("A response already exists for this review", 400);
  }

  const now = new Date();
  const created =
    await MyGlobal.prisma.shopping_mall_review_seller_responses.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        shopping_mall_review_id: props.reviewId,
        shopping_mall_seller_id: props.seller.id,
        response_body: props.body.response_body,
        status: "pending_moderation",
        created_at: now,
        updated_at: now,
      },
    });

  return {
    id: created.id,
    shopping_mall_review_id: created.shopping_mall_review_id,
    shopping_mall_seller_id: created.shopping_mall_seller_id,
    response_body: created.response_body,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null
        ? undefined
        : toISOStringSafe(created.deleted_at),
  };
}
