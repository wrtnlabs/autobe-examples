import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallReviewTransformer } from "../transformers/ShoppingMallReviewTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallCustomerReviewsReviewId(props: {
  customer: CustomerPayload;
  reviewId: string;
  body: IShoppingMallReview.IUpdate;
}): Promise<IShoppingMallReview> {
  // Fetch review with ownership verification data
  const review = await MyGlobal.prisma.shopping_mall_reviews.findUniqueOrThrow({
    where: { id: props.reviewId },
    select: {
      id: true,
      shopping_mall_customer_id: true,
      rating: true,
      content: true,
      deleted_at: true,
    },
  });
  // Authorization: verify ownership
  if (review.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Check not soft-deleted
  if (review.deleted_at !== null) {
    throw new HttpException("Review not found", 404);
  }
  // Create snapshot before update
  await MyGlobal.prisma.shopping_mall_review_snapshots.create({
    data: {
      id: v4(),
      shopping_mall_review_id: review.id,
      rating: review.rating,
      content: review.content,
      created_at: new Date(),
    },
  });
  // Update review with partial update
  const updated = await MyGlobal.prisma.shopping_mall_reviews.update({
    where: { id: props.reviewId },
    data: {
      ...(props.body.rating !== undefined && { rating: props.body.rating }),
      ...(props.body.content !== undefined && { content: props.body.content }),
      updated_at: new Date(),
    },
    ...ShoppingMallReviewTransformer.select(),
  });
  return await ShoppingMallReviewTransformer.transform(updated);
}
