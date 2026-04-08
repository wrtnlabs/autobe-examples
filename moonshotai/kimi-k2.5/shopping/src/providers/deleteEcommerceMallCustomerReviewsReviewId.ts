import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function deleteEcommerceMallCustomerReviewsReviewId(props: {
  customer: CustomerPayload;
  reviewId: string;
}): Promise<void> {
  // Find the review and verify it exists and is not deleted
  const review = await MyGlobal.prisma.ecommerce_mall_reviews.findFirst({
    where: {
      id: props.reviewId,
      deleted_at: null,
    },
    select: {
      id: true,
      customer_id: true,
    },
  });
  if (review === null) {
    throw new HttpException("Review not found", 404);
  }
  // Verify the authenticated customer is the author
  if (review.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Soft delete the review
  await MyGlobal.prisma.ecommerce_mall_reviews.update({
    where: {
      id: props.reviewId,
    },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });
}
