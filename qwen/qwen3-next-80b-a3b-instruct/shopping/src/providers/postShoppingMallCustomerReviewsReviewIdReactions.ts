import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallReviewReaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReaction";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerReviewsReviewIdReactions(props: {
  customer: CustomerPayload;
  reviewId: string;
  body: IShoppingMallReviewReaction.ICreate;
}): Promise<IShoppingMallReviewReaction> {
  // Validate: review must exist and belong to a different customer
  const review = await MyGlobal.prisma.shopping_mall_reviews.findUnique({
    where: { id: props.reviewId },
    select: { id: true, customer: true },
  });

  if (!review) {
    throw new HttpException("Review not found", 404);
  }

  if (review.customer.id === props.customer.id) {
    throw new HttpException("Cannot react to your own review", 403);
  }

  // Check for existing reaction from this customer on this review
  const existingReaction =
    await MyGlobal.prisma.shopping_mall_review_reactions.findUnique({
      where: {
        shopping_mall_review_id_shopping_mall_customer_id: {
          shopping_mall_review_id: props.reviewId,
          shopping_mall_customer_id: props.customer.id,
        },
      },
    });

  if (existingReaction) {
    throw new HttpException("Already reacted to this review", 409);
  }

  // Create the new reaction
  const reaction = await MyGlobal.prisma.shopping_mall_review_reactions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_review_id: props.reviewId,
      shopping_mall_customer_id: props.customer.id,
      reaction_type: typia.assert<"upvote" | "downvote">(props.body),
      created_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
    },
  });

  // Return the complete reaction object as defined by IShoppingMallReviewReaction
  return {
    type: typia.assert<"upvote" | "downvote">(reaction.reaction_type),
  };
}
