import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingCustomerReviewsReviewId(props: {
  customer: CustomerPayload;
  reviewId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Fetch the review to check if it exists and is owned by the customer
  const review = await MyGlobal.prisma.shopping_reviews.findUnique({
    where: { id: props.reviewId },
    select: { id: true, shopping_customer_id: true },
  });
  if (!review) {
    throw new HttpException("Review not found", 404);
  }
  if (review.shopping_customer_id !== props.customer.id) {
    throw new HttpException(
      "Forbidden: You can only delete your own reviews",
      403,
    );
  }
  // Delete attachments and review in transaction
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.shopping_review_attachments.deleteMany({
      where: { shopping_review_id: props.reviewId },
    }),
    MyGlobal.prisma.shopping_reviews.delete({
      where: { id: props.reviewId },
    }),
  ]);
}
