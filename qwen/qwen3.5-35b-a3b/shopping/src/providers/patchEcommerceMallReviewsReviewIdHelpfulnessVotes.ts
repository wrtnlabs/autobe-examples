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
import { EcommerceMallReviewHelpfulnessVoteTransformer } from "../transformers/EcommerceMallReviewHelpfulnessVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallReviewsReviewIdHelpfulnessVotes(props: {
  customerId: string & tags.Format<"uuid">;
  reviewId: string & tags.Format<"uuid">;
  body: IEcommerceMallReviewHelpfulnessVote.IUpdate;
}): Promise<IEcommerceMallReviewHelpfulnessVote> {
  await MyGlobal.prisma.ecommerce_mall_reviews.findUniqueOrThrow({
    where: { id: props.reviewId },
    select: { id: true },
  });
  const existingVote =
    await MyGlobal.prisma.ecommerce_mall_review_helpfulness_votes.findFirst({
      where: {
        ecommerce_mall_review_id: props.reviewId,
        ecommerce_mall_customer_id: props.customerId,
        deleted_at: null,
      },
      select: { id: true, helpfulness: true, updated_at: true },
    });
  let vote: EcommerceMallReviewHelpfulnessVoteTransformer.Payload;
  if (existingVote) {
    vote = await MyGlobal.prisma.ecommerce_mall_review_helpfulness_votes.update(
      {
        where: { id: existingVote.id },
        data: {
          helpfulness: props.body.helpfulness ?? false,
          updated_at: new Date(),
        },
        ...EcommerceMallReviewHelpfulnessVoteTransformer.select(),
      },
    );
  } else {
    vote = await MyGlobal.prisma.ecommerce_mall_review_helpfulness_votes.create(
      {
        data: {
          id: v4(),
          ecommerce_mall_customer_id: props.customerId,
          ecommerce_mall_review_id: props.reviewId,
          helpfulness: props.body.helpfulness ?? false,
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        },
        ...EcommerceMallReviewHelpfulnessVoteTransformer.select(),
      },
    );
  }
  return EcommerceMallReviewHelpfulnessVoteTransformer.transform(vote);
}
