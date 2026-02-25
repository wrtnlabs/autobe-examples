import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReview";
import { IEcommerceReviewVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReviewVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceReviewVoteCollector } from "../collectors/EcommerceReviewVoteCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceReviewVoteTransformer } from "../transformers/EcommerceReviewVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceCustomerReviewsReviewIdHelpfulVotes(props: {
  customer: CustomerPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IEcommerceReviewVote.ICreate;
}): Promise<IEcommerceReviewVote> {
  // Verify the review exists and is not deleted
  const review = await MyGlobal.prisma.ecommerce_reviews.findUniqueOrThrow({
    where: { id: props.reviewId },
  });
  // Check if vote already exists for this customer and review
  const existingVote = await MyGlobal.prisma.ecommerce_review_votes.findUnique({
    where: {
      ecommerce_customer_id_ecommerce_review_id: {
        ecommerce_customer_id: props.customer.id,
        ecommerce_review_id: props.reviewId,
      },
    },
  });
  if (existingVote) {
    throw new HttpException("You have already voted on this review", 400);
  }
  // Create the vote using the collector
  const vote = await MyGlobal.prisma.ecommerce_review_votes.create({
    data: await EcommerceReviewVoteCollector.collect({
      body: props.body,
      ecommerceCustomers: { id: props.customer.id },
      ecommerceCustomerSessions: { id: props.customer.session_id },
      ecommerceReviews: { id: props.reviewId },
    }),
    ...EcommerceReviewVoteTransformer.select(),
  });
  return EcommerceReviewVoteTransformer.transform(vote);
}
