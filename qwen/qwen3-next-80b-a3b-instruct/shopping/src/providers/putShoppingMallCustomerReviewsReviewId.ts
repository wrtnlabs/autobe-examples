import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putShoppingMallCustomerReviewsReviewId(props: {
  customer: CustomerPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IShoppingMallReview.IUpdate;
}): Promise<IShoppingMallReview> {
  // Verify review exists and belongs to authenticated customer
  const existingReview = await MyGlobal.prisma.shopping_mall_reviews.findUnique(
    {
      where: { id: props.reviewId },
      select: {
        id: true,
        rating: true,
        text: true,
        product_id: true,
        customer_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    },
  );
  if (!existingReview) {
    throw new HttpException("Review not found", 404);
  }
  // Verify user owns this review
  if (existingReview.customer_id !== props.customer.id) {
    throw new HttpException(
      "Forbidden - You can only update your own reviews",
      403,
    );
  }
  // Update the review
  await MyGlobal.prisma.shopping_mall_reviews.update({
    where: { id: props.reviewId },
    data: {
      rating: props.body.rating,
      text: props.body.text,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // Return empty object as per IShoppingMallReview type definition
  return {};
}
