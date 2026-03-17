import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallReviewTransformer } from "../transformers/EcommerceMallReviewTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallCustomerReviewsReviewId(props: {
  customer: CustomerPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IEcommerceMallReview.IUpdate;
}): Promise<IEcommerceMallReview> {
  // 1. Find review and verify it exists
  const review = await MyGlobal.prisma.ecommerce_mall_reviews.findUnique({
    where: { id: props.reviewId },
    select: {
      id: true,
      customer_id: true,
      product_id: true,
      order_item_id: true,
      rating: true,
      content: true,
      is_deleted: true,
      updated_at: true,
    },
  });
  if (review === null) {
    throw new HttpException("Review not found", 404);
  }
  // 2. Verify ownership - customer must own the review
  if (review.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Verify review is not deleted
  if (review.is_deleted) {
    throw new HttpException("Review is already deleted", 400);
  }
  // 4. Validate rating if provided (1-5 range)
  if (props.body.rating !== undefined) {
    if (props.body.rating < 1 || props.body.rating > 5) {
      throw new HttpException("Rating must be between 1 and 5", 400);
    }
  }
  // 5. Validate content length if provided (max 10000 characters)
  if (props.body.content !== undefined && props.body.content !== null) {
    if (props.body.content.length > 10000) {
      throw new HttpException(
        "Content exceeds maximum length of 10000 characters",
        400,
      );
    }
  }
  // 6. Create snapshot with previous and current values
  const now = new Date();
  const previousValues = {
    rating: review.rating,
    content: review.content,
    is_deleted: review.is_deleted,
    updated_at: review.updated_at.toISOString(),
  };
  const currentValues = {
    rating: props.body.rating ?? review.rating,
    content: props.body.content ?? review.content,
    is_deleted: review.is_deleted,
    updated_at: now.toISOString(),
  };
  await MyGlobal.prisma.ecommerce_mall_review_snapshots.create({
    data: {
      id: v4(),
      ecommerce_mall_review_id: props.reviewId,
      changed_by_customer_id: props.customer.id,
      created_at: now,
      previous_values: JSON.stringify(previousValues),
      current_values: JSON.stringify(currentValues),
    },
  });
  // 7. Update the review
  await MyGlobal.prisma.ecommerce_mall_reviews.update({
    where: { id: props.reviewId },
    data: {
      rating: props.body.rating ?? review.rating,
      content: props.body.content ?? review.content,
      updated_at: now,
    },
  });
  // 8. Fetch updated review with all relations using transformer
  const updated =
    await MyGlobal.prisma.ecommerce_mall_reviews.findUniqueOrThrow({
      where: { id: props.reviewId },
      ...EcommerceMallReviewTransformer.select(),
    });
  return await EcommerceMallReviewTransformer.transform(updated);
}
