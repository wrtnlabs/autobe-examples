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

export async function deleteEcommerceMallCustomerCustomersReviewsReviewId(props: {
  customer: CustomerPayload;
  reviewId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the review - throws 404 if not found
  const review = await MyGlobal.prisma.ecommerce_mall_reviews.findUniqueOrThrow(
    {
      where: { id: props.reviewId },
      select: {
        id: true,
        ecommerce_mall_customer_id: true,
        deleted_at: true,
      },
    },
  );
  // Validate ownership - only the review author can delete
  if (review.ecommerce_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate not already deleted - return 409 Conflict
  if (review.deleted_at !== null) {
    throw new HttpException("Review already deleted", 409);
  }
  // Soft delete the review
  await MyGlobal.prisma.ecommerce_mall_reviews.update({
    where: { id: props.reviewId },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });
}
