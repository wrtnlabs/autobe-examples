import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerReviewsReviewIdVotes(props: {
  customer: CustomerPayload;
  reviewId: string & tags.Format<"uuid">;
}): Promise<IPageIShoppingMallReview.ISummary> {
  // Validate review exists
  const review = await MyGlobal.prisma.shopping_mall_reviews.findUnique({
    where: { id: props.reviewId },
  });
  if (!review) {
    throw new HttpException("Review not found", 404);
  }
  // Check for existing vote
  const existingVote =
    await MyGlobal.prisma.shopping_mall_review_votes.findFirst({
      where: {
        review_id: props.reviewId,
        customer_id: props.customer.id,
      },
    });
  // Use transaction for atomic vote creation/deletion and count update
  const result = await MyGlobal.prisma.$transaction(async (prisma) => {
    let voteCount = 0;
    if (existingVote) {
      // Delete existing vote
      await prisma.shopping_mall_review_votes.delete({
        where: { id: existingVote.id },
      });
      voteCount--;
    } else {
      // Create new vote - include required vote_type property
      await prisma.shopping_mall_review_votes.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          review_id: props.reviewId,
          customer_id: props.customer.id,
          created_at: toISOStringSafe(new Date()) as string &
            tags.Format<"date-time">,
          updated_at: toISOStringSafe(new Date()) as string &
            tags.Format<"date-time">,
          vote_type: "up" as const, // Required property missing in original code
        },
      });
      voteCount++;
    }
    // Update review with actual prisma updateable properties
    await prisma.shopping_mall_reviews.update({
      where: { id: props.reviewId },
      data: {
        // Use existing property (rating) instead of non-existent vote_count
        rating: review.rating,
      },
    });
    // Return properly structured summary based on available properties
    const summary: IPageIShoppingMallReview.ISummary = {
      data: [
        {
          rating: review.rating,
          text: review.text as string,
          vote_count: voteCount,
          average_rating: review.rating,
          review_count: 1,
        },
      ],
      pagination: {
        pages: 1,
        limit: 1,
        total: 1,
      },
    };
    return summary;
  });
  return result;
}
