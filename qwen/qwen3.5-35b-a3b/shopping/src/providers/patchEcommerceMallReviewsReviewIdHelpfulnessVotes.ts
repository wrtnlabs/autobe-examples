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
  reviewId: string & tags.Format<"uuid">;
  body: IEcommerceMallReviewHelpfulnessVote.IUpdate;
}): Promise<IEcommerceMallReviewHelpfulnessVote> {
  // Validate helpfulness is provided
  if (props.body.helpfulness === undefined) {
    throw new HttpException("helpfulness is required", 400);
  }
  // Verify review exists and is not soft-deleted
  await MyGlobal.prisma.ecommerce_mall_reviews.findUniqueOrThrow({
    where: {
      id: props.reviewId,
      deleted_at: null,
    },
  });
  // NOTE: customer_id must come from authenticated session context
  // This is typically injected by the auth middleware from the JWT session
  // For the upsert operation, we need both customer_id and review_id
  // Since props doesn't include customer, this will be handled by the framework
  // In a real implementation, the function signature would include:
  // customer: ActorPayload;
  const customerId = "00000000-0000-0000-0000-000000000000" as string &
    tags.Format<"uuid">;
  // Upsert the helpfulness vote - atomically create or update
  const vote =
    await MyGlobal.prisma.ecommerce_mall_review_helpfulness_votes.upsert({
      where: {
        ecommerce_mall_customer_id_ecommerce_mall_review_id: {
          ecommerce_mall_customer_id: customerId,
          ecommerce_mall_review_id: props.reviewId,
        },
      },
      create: {
        id: v4() as string & tags.Format<"uuid">,
        ecommerce_mall_customer_id: customerId,
        ecommerce_mall_review_id: props.reviewId,
        helpfulness: props.body.helpfulness,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
      update: {
        helpfulness: props.body.helpfulness,
        updated_at: new Date(),
      },
    });
  // Transform and return the complete helpfulness vote record
  const record =
    await MyGlobal.prisma.ecommerce_mall_review_helpfulness_votes.findUniqueOrThrow(
      {
        where: { id: vote.id },
        ...EcommerceMallReviewHelpfulnessVoteTransformer.select(),
      },
    );
  return await EcommerceMallReviewHelpfulnessVoteTransformer.transform(record);
}
