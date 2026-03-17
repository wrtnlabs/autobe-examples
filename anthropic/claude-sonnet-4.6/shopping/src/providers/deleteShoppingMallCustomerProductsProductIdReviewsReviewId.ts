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

export async function deleteShoppingMallCustomerProductsProductIdReviewsReviewId(props: {
  customer: CustomerPayload;
  productId: string & tags.Format<"uuid">;
  reviewId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Look up the review — 404 if not found
  const review = await MyGlobal.prisma.shopping_mall_reviews.findUniqueOrThrow({
    where: { id: props.reviewId },
    select: {
      id: true,
      customer_id: true,
      product_id: true,
      deleted_at: true,
    },
  });
  // Step 2: Validate that the review belongs to the specified product — 404 if mismatch
  if (review.product_id !== props.productId) {
    throw new HttpException("Review not found for this product", 404);
  }
  // Step 3: Validate that the review belongs to the requesting customer — 403 if not
  if (review.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 4: Validate that the review has not already been deleted — 404 if already deleted
  if (review.deleted_at !== null) {
    throw new HttpException("Review not found", 404);
  }
  // Step 5: Soft-delete the review by setting deleted_at to now
  await MyGlobal.prisma.shopping_mall_reviews.update({
    where: { id: props.reviewId },
    data: {
      deleted_at: new Date(),
    },
  });
  // Step 6: No snapshot deletion — snapshots are permanently preserved
  // Step 7: No product average_rating column to update — calculated dynamically on read
  // Return void (204 No Content)
}
