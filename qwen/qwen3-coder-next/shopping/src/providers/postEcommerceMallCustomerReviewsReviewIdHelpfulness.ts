import { IEcommerceMallReviewHelpfulnessVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReviewHelpfulnessVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallReviewHelpfulnessVoteCollector } from "../collectors/EcommerceMallReviewHelpfulnessVoteCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

/**
 * Cast a helpfulness vote on a review.
 *
 * This endpoint allows customers to indicate that they found a review helpful.
 * Each customer can cast only one helpfulness vote per review.
 *
 * @param props.customer Authenticated customer making the request
 * @param props.reviewId Target review ID from path parameter
 * @param props.body Request body containing review_id (must match path parameter)
 */
export async function postEcommerceMallCustomerReviewsReviewIdHelpfulness(props: {
  customer: {
    id: string;
    session_id: string;
    type: "customer";
  };
  reviewId: string;
  body: {
    review_id: string;
  };
}): Promise<void> {
  // Validate reviewId exists and is not deleted
  const targetReview =
    await MyGlobal.prisma.ecommerce_mall_reviews.findUniqueOrThrow({
      where: { id: props.reviewId },
      select: { id: true, deleted_at: true, customer_id: true },
    });
  // Check review is not deleted
  if (targetReview.deleted_at !== null) {
    throw new HttpException("Review not found", 404);
  }
  // Check customer is not the review author (cannot vote on own review)
  if (targetReview.customer_id === props.customer.id) {
    throw new HttpException("Cannot vote on your own review", 400);
  }
  // Check for existing vote from this customer on this review
  const existingVote =
    await MyGlobal.prisma.ecommerce_mall_review_helpfulness_votes.findUnique({
      where: {
        customer_id_review_id: {
          customer_id: props.customer.id,
          review_id: props.reviewId,
        },
      },
      select: { id: true },
    });
  if (existingVote !== null) {
    throw new HttpException("Already voted on this review", 400);
  }
  // Use collector to create vote record
  await MyGlobal.prisma.ecommerce_mall_review_helpfulness_votes.create({
    data: await EcommerceMallReviewHelpfulnessVoteCollector.collect({
      body: props.body,
      ecommerceMallCustomers: { id: props.customer.id },
      ecommerceMallReviews: { id: props.reviewId },
    }),
  });
}
