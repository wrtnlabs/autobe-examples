import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerReviewsReviewId(props: {
  customer: CustomerPayload;
  reviewId: string;
  body: IShoppingMallReview.IUpdate;
}): Promise<IShoppingMallReview> {
  // Fetch the existing review
  const existingReview = await MyGlobal.prisma.shopping_mall_reviews.findUnique(
    {
      where: { id: props.reviewId },
    },
  );
  if (!existingReview) {
    throw new HttpException("Review not found", 404);
  }
  // Verify ownership: review.customer_id must match current user's customer_id
  if (existingReview.customer_id !== props.customer.id) {
    throw new HttpException(
      "Forbidden: You can only update your own reviews",
      403,
    );
  }
  // Since IShoppingMallReview.IUpdate is empty ({}), no update operations are possible
  // Return the current review
  return {
    id: existingReview.id,
    customer_id: existingReview.customer_id,
    order_item_id: existingReview.order_item_id,
    rating: existingReview.rating,
    content: existingReview.content,
  };
}
