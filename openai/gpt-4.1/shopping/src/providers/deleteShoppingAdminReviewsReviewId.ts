import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingAdminReviewsReviewId(props: {
  admin: AdminPayload;
  reviewId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Check if review exists
  const review = await MyGlobal.prisma.shopping_reviews.findUnique({
    where: { id: props.reviewId },
    select: { id: true },
  });
  if (!review) {
    throw new HttpException("Review not found", 404);
  }

  // Delete all attachments for this review
  await MyGlobal.prisma.shopping_review_attachments.deleteMany({
    where: { shopping_review_id: props.reviewId },
  });

  // Delete the review (hard delete)
  await MyGlobal.prisma.shopping_reviews.delete({
    where: { id: props.reviewId },
  });
}
