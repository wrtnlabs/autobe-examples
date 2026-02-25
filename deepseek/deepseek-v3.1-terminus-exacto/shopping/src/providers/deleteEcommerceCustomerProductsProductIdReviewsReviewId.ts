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

export async function deleteEcommerceCustomerProductsProductIdReviewsReviewId(props: {
  customer: CustomerPayload;
  productId: string & tags.Format<"uuid">;
  reviewId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify review exists and belongs to customer
  const review = await MyGlobal.prisma.ecommerce_reviews.findUniqueOrThrow({
    where: { id: props.reviewId },
    select: {
      id: true,
      ecommerce_customer_id: true,
      ecommerce_product_id: true,
      is_deleted: true,
    } satisfies Prisma.ecommerce_reviewsSelect,
  });
  // Authorization check - customer must own the review
  if (review.ecommerce_customer_id !== props.customer.id) {
    throw new HttpException(
      "You are not authorized to delete this review",
      403,
    );
  }
  // Verify review belongs to specified product
  if (review.ecommerce_product_id !== props.productId) {
    throw new HttpException(
      "Review does not belong to the specified product",
      400,
    );
  }
  // Check if already deleted
  if (review.is_deleted) {
    // Already deleted, nothing to do
    return;
  }
  // Perform soft deletion with proper ISO string timestamp
  const now = new Date().toISOString();
  await MyGlobal.prisma.ecommerce_reviews.update({
    where: { id: props.reviewId },
    data: {
      is_deleted: true,
      deleted_at: now,
      updated_at: now,
    },
  });
  // No return value needed for void promise
}
