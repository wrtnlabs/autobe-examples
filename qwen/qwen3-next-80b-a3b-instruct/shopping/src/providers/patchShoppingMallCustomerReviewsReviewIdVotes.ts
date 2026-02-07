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

export async function patchShoppingMallCustomerReviewsReviewIdVotes(props: {
  customer: CustomerPayload;
  reviewId: string;
  body: IShoppingMallReviewVote.IRequest;
}): Promise<void> {
  // Lookup review
  const review = await MyGlobal.prisma.shopping_mall_reviews.findUnique({
    where: { id: props.reviewId },
  });
  if (!review) {
    throw new HttpException("Review not found", 404);
  }
  // Ensure review is not deleted
  if (review.deleted_at !== null) {
    throw new HttpException("Review not found", 404);
  }
  // Verify review belongs to customer via order item
  const customerOrderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findFirst({
      where: {
        id: review.shopping_mall_order_item_id,
      },
    });
  if (!customerOrderItem) {
    throw new HttpException("Forbidden", 403);
  }
  // Use collector to generate create input
  const customer = await MyGlobal.prisma.shopping_mall_customers.findUnique({
    where: { id: props.customer.id },
  });
  if (!customer) {
    throw new HttpException("Customer not found", 404);
  }
  const session =
    await MyGlobal.prisma.shopping_mall_customer_sessions.findUnique({
      where: { id: props.customer.session_id },
    });
  if (!session) {
    throw new HttpException("Customer session not found", 404);
  }
  const createInput = await ShoppingMallReviewVoteCollector.collect({
    body: props.body,
    shoppingMallReviews: review,
    shoppingMallCustomers: customer as IEntity,
    shoppingMallCustomerSessions: session as IEntity,
  });
  // Upsert vote with exact field names and proper types
  await MyGlobal.prisma.shopping_mall_review_votes.upsert({
    where: {
      shopping_mall_review_id_shopping_mall_customer_id: {
        shopping_mall_review_id: props.reviewId,
        shopping_mall_customer_id: props.customer.id,
      },
    },
    create: createInput,
    update: createInput,
  });
  return;
}
