import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallReviewHelpfulnessVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewHelpfulnessVote";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

export async function deleteShoppingMallBuyerReviewsReviewIdHelpfulnessVotesVoteId(props: {
  buyer: BuyerPayload;
  reviewId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallReviewHelpfulnessVote> {
  const vote =
    await MyGlobal.prisma.shopping_mall_review_helpfulness_votes.findUnique({
      where: { id: props.voteId },
    });

  if (!vote) {
    throw new HttpException("Helpfulness vote not found", 404);
  }

  if (vote.shopping_mall_buyer_id !== props.buyer.id) {
    throw new HttpException("Forbidden", 403);
  }

  if (vote.shopping_mall_review_id !== props.reviewId) {
    throw new HttpException(
      "Vote does not belong to the specified review",
      400,
    );
  }

  const deleted =
    await MyGlobal.prisma.shopping_mall_review_helpfulness_votes.delete({
      where: { id: props.voteId },
    });

  return {
    id: deleted.id,
    shopping_mall_review_id: deleted.shopping_mall_review_id,
    shopping_mall_buyer_id: deleted.shopping_mall_buyer_id,
    is_helpful: deleted.is_helpful,
    created_at: toISOStringSafe(deleted.created_at),
  };
}
