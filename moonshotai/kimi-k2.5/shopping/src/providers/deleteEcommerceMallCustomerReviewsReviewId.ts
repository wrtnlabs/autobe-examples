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
  // Lookup review to verify existence and ownership
  const review = await MyGlobal.prisma.ecommerce_mall_reviews.findUnique({
    where: { id: props.reviewId },
    select: {
      id: true,
      customer_id: true,
      deleted_at: true,
    },
  });
  // Not found - 404
  if (review === null) {
    throw new HttpException("Review not found", 404);
  }
  // Ownership check - 403 if not the author
  if (review.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Idempotent: already deleted, treat as success
  if (review.deleted_at !== null) {
    return;
  }
  // Soft delete - set deleted_at timestamp
  await MyGlobal.prisma.ecommerce_mall_reviews.update({
    where: { id: props.reviewId },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });
}
