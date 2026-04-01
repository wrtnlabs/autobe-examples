import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
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
import { EcommerceMallReviewHelpfulnessVoteTransformer } from "../transformers/EcommerceMallReviewHelpfulnessVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallCustomerReviewsReviewIdHelpfulnessVotes(props: {
  customer: CustomerPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IEcommerceMallReviewHelpfulnessVote.ICreate;
}): Promise<IEcommerceMallReviewHelpfulnessVote> {
  await MyGlobal.prisma.ecommerce_mall_reviews.findUniqueOrThrow({
    where: { id: props.reviewId },
  });
  const existingVote =
    await MyGlobal.prisma.ecommerce_mall_review_helpfulness_votes.findFirst({
      where: {
        ecommerce_mall_customer_id: props.customer.id,
        ecommerce_mall_review_id: props.reviewId,
        deleted_at: null,
      },
    });
  if (existingVote !== null) {
    throw new HttpException("Review already voted by this customer", 409);
  }
  const created =
    await MyGlobal.prisma.ecommerce_mall_review_helpfulness_votes.create({
      data: await EcommerceMallReviewHelpfulnessVoteCollector.collect({
        body: props.body,
        ecommerceMallReviews: { id: props.reviewId },
        ecommerceMallCustomers: { id: props.customer.id },
      }),
      ...EcommerceMallReviewHelpfulnessVoteTransformer.select(),
    });
  return await EcommerceMallReviewHelpfulnessVoteTransformer.transform(created);
}
