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
  reviewId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Retrieve the review by reviewId
  const review = await MyGlobal.prisma.ecommerce_mall_reviews.findUnique({
    where: { id: props.reviewId },
    select: {
      id: true,
      ecommerce_mall_customer_id: true,
      deleted_at: true,
    },
  });
  // If review not found or already deleted, return 404
  if (review === null || review.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  // Verify the review belongs to the authenticated customer
  if (review.ecommerce_mall_customer_id !== props.customer.id) {
    throw new HttpException("Not Found", 404);
  }
  // Perform soft delete by setting deleted_at timestamp
  await MyGlobal.prisma.ecommerce_mall_reviews.update({
    where: { id: props.reviewId },
    data: {
      deleted_at: new Date(),
    },
  });
}
