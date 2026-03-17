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
  const { review_id, helpfulness } = props.body;
  // Verify review exists and get its order_id and product_id
  const review = await MyGlobal.prisma.ecommerce_mall_reviews.findUniqueOrThrow(
    {
      where: { id: review_id },
      select: {
        id: true,
        order_id: true,
        product_id: true,
      },
    },
  );
  // Verify customer has purchased this specific product
  const order = await MyGlobal.prisma.ecommerce_mall_orders.findUniqueOrThrow({
    where: { id: review.order_id },
    select: { id: true, customer_id: true },
  });
  if (order.customer_id !== props.customer.id) {
    throw new HttpException(
      "Forbidden: You haven't purchased this product",
      403,
    );
  }
  // Verify the customer actually purchased this product in this order
  const orderItem = await MyGlobal.prisma.ecommerce_mall_order_items.findFirst({
    where: {
      ecommerce_mall_order_id: review.order_id,
      product_snapshot_id: review.product_id,
    },
    select: { id: true },
  });
  if (!orderItem) {
    throw new HttpException(
      "Forbidden: You haven't purchased this product in this order",
      403,
    );
  }
  // Upsert the helpfulness vote
  const upserted =
    await MyGlobal.prisma.ecommerce_mall_review_helpfulness_votes.upsert({
      where: {
        ecommerce_mall_customer_id_ecommerce_mall_review_id: {
          ecommerce_mall_customer_id: props.customer.id,
          ecommerce_mall_review_id: review_id,
        },
      },
      create: {
        id: v4(),
        ecommerce_mall_customer_id: props.customer.id,
        ecommerce_mall_review_id: review_id,
        helpfulness,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
      update: {
        helpfulness,
        updated_at: new Date(),
        deleted_at: null,
      },
    });
  // Fetch the vote with full relations using the transformer's select
  const vote =
    await MyGlobal.prisma.ecommerce_mall_review_helpfulness_votes.findUniqueOrThrow(
      {
        where: { id: upserted.id },
        ...EcommerceMallReviewHelpfulnessVoteTransformer.select(),
      },
    );
  return await EcommerceMallReviewHelpfulnessVoteTransformer.transform(vote);
}
