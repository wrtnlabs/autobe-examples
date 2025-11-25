import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallReviewHelpfulnessVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewHelpfulnessVote";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

export async function postShoppingMallBuyerReviewsReviewIdHelpfulnessVotes(props: {
  buyer: BuyerPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IShoppingMallReviewHelpfulnessVote.ICreate;
}): Promise<IShoppingMallReviewHelpfulnessVote> {
  const review = await MyGlobal.prisma.shopping_mall_reviews.findFirst({
    where: {
      id: props.reviewId,
      deleted_at: null,
    },
  });

  if (!review) {
    throw new HttpException("Review not found", 404);
  }

  const existingVote =
    await MyGlobal.prisma.shopping_mall_review_helpfulness_votes.findFirst({
      where: {
        shopping_mall_review_id: props.reviewId,
        shopping_mall_buyer_id: props.buyer.id,
      },
    });

  if (existingVote) {
    const updated =
      await MyGlobal.prisma.shopping_mall_review_helpfulness_votes.update({
        where: { id: existingVote.id },
        data: {
          is_helpful: props.body.is_helpful,
        },
      });

    return {
      id: updated.id,
      shopping_mall_review_id: updated.shopping_mall_review_id,
      shopping_mall_buyer_id: updated.shopping_mall_buyer_id,
      is_helpful: updated.is_helpful,
      created_at: toISOStringSafe(updated.created_at),
    };
  }

  const created =
    await MyGlobal.prisma.shopping_mall_review_helpfulness_votes.create({
      data: {
        id: v4(),
        shopping_mall_review_id: props.reviewId,
        shopping_mall_buyer_id: props.buyer.id,
        is_helpful: props.body.is_helpful,
        created_at: new Date(),
      },
    });

  return {
    id: created.id,
    shopping_mall_review_id: created.shopping_mall_review_id,
    shopping_mall_buyer_id: created.shopping_mall_buyer_id,
    is_helpful: created.is_helpful,
    created_at: toISOStringSafe(created.created_at),
  };
}
