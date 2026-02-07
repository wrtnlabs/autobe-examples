import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallReviewVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallReviewVoteCollector } from "../collectors/ShoppingMallReviewVoteCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerReviewsReviewIdVotes(props: {
  customer: CustomerPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IShoppingMallReviewVote.ICreate;
}): Promise<IShoppingMallReviewVote> {
  // Load the review to use as reference for the collector.
  const review = await MyGlobal.prisma.shopping_mall_reviews.findUnique({
    where: { id: props.reviewId, deleted_at: null },
  });
  if (!review) throw new HttpException("Review not found", 404);
  // Use the already-loaded collector with correct parameter names
  const created = await MyGlobal.prisma.shopping_mall_review_votes.create({
    data: await ShoppingMallReviewVoteCollector.collect({
      body: props.body,
      shoppingMallReviews: review,
      shoppingMallCustomers: { id: props.customer.id },
      shoppingMallCustomerSessions: { id: props.customer.session_id },
    }),
  });
  // Use manual transformation since no transformer is loaded
  return {
    id: created.id,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
