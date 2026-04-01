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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallReviewHelpfulnessVoteTransformer } from "../transformers/EcommerceMallReviewHelpfulnessVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerReviewsHelpful(props: {
  customer: CustomerPayload;
  body: IEcommerceMallReviewHelpfulnessVote.IRequest;
}): Promise<IEcommerceMallReviewHelpfulnessVote> {
  // Verify review exists and get its order_id and product_id for purchase validation
  const review = await MyGlobal.prisma.ecommerce_mall_reviews.findUniqueOrThrow(
    {
      where: { id: props.body.review_id },
      select: { id: true, order_id: true, product_id: true },
    },
  );
  // Verify customer has purchased this product through the order
  const purchase = await MyGlobal.prisma.ecommerce_mall_order_items.findFirst({
    where: {
      ecommerce_mall_order_id: review.order_id,
      product_snapshot_id: review.product_id,
    },
    select: { id: true },
  });
  if (purchase === null) {
    throw new HttpException("Customer has not purchased this product", 403);
  }
  // Upsert the helpfulness vote
  const vote =
    await MyGlobal.prisma.ecommerce_mall_review_helpfulness_votes.upsert({
      where: {
        ecommerce_mall_customer_id_ecommerce_mall_review_id: {
          ecommerce_mall_customer_id: props.customer.id,
          ecommerce_mall_review_id: props.body.review_id,
        },
      },
      create: {
        id: v4() as string & tags.Format<"uuid">,
        ecommerce_mall_customer_id: props.customer.id,
        ecommerce_mall_review_id: props.body.review_id,
        helpfulness: props.body.helpfulness,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
      update: {
        helpfulness: props.body.helpfulness,
        updated_at: new Date(),
        deleted_at: null,
      },
      ...EcommerceMallReviewHelpfulnessVoteTransformer.select(),
    });
  return await EcommerceMallReviewHelpfulnessVoteTransformer.transform(vote);
}
