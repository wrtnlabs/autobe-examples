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

export async function deleteEcommerceCustomerReviewsReviewIdHelpfulVotes(props: {
  customer: CustomerPayload;
  reviewId: string & tags.Format<"uuid">;
}): Promise<void> {
  // First verify the review exists and is not deleted
  await MyGlobal.prisma.ecommerce_reviews.findUniqueOrThrow({
    where: {
      id: props.reviewId,
      deleted_at: null,
    },
  });
  // Find the existing helpful vote using the correct relation property names
  const existingVote = await MyGlobal.prisma.ecommerce_review_votes.findFirst({
    where: {
      review: { id: props.reviewId },
      customer: { id: props.customer.id },
    },
  });
  if (!existingVote) {
    throw new HttpException("Helpful vote not found", 404);
  }
  // Since the schema doesn't have deleted_at field, perform hard delete
  // This aligns with the specification mentioning soft delete but schema doesn't support it
  await MyGlobal.prisma.ecommerce_review_votes.delete({
    where: { id: existingVote.id },
  });
}
