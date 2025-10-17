import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { IShoppingMallReviewHelpfulnessVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewHelpfulnessVote";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerReviewsReviewIdVote(props: {
  customer: CustomerPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IShoppingMallReview.IVote;
}): Promise<IShoppingMallReviewHelpfulnessVote> {
  const { customer, reviewId, body } = props;

  const review = await MyGlobal.prisma.shopping_mall_reviews.findFirst({
    where: {
      id: reviewId,
      deleted_at: null,
      status: "approved",
    },
  });

  if (!review) {
    throw new HttpException("Review not found or not published", 404);
  }

  if (review.shopping_mall_customer_id === customer.id) {
    throw new HttpException("You cannot vote on your own review", 403);
  }

  const now = toISOStringSafe(new Date());

  const vote =
    await MyGlobal.prisma.shopping_mall_review_helpfulness_votes.upsert({
      where: {
        shopping_mall_review_id_shopping_mall_customer_id: {
          shopping_mall_review_id: reviewId,
          shopping_mall_customer_id: customer.id,
        },
      },
      create: {
        id: v4() as string & tags.Format<"uuid">,
        shopping_mall_review_id: reviewId,
        shopping_mall_customer_id: customer.id,
        is_helpful: body.is_helpful,
        created_at: now,
        updated_at: now,
      },
      update: {
        is_helpful: body.is_helpful,
        updated_at: now,
      },
    });

  return {
    id: vote.id as string & tags.Format<"uuid">,
    is_helpful: vote.is_helpful,
    created_at: toISOStringSafe(vote.created_at),
    updated_at: toISOStringSafe(vote.updated_at),
  };
}
