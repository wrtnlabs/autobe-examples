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

export async function deleteShoppingMallCustomerSaleReviewsReviewId(props: {
  customer: CustomerPayload;
  reviewId: string & tags.Format<"uuid">;
}): Promise<void> {
  const review = await MyGlobal.prisma.shopping_mall_sale_reviews.findUnique({
    where: { id: props.reviewId },
    select: { id: true, shopping_mall_customer_id: true },
  });
  if (!review) {
    throw new HttpException("Review not found", 404);
  }
  // Authorization: allow if customer owns the review
  if (review.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_sale_reviews.delete({
      where: { id: props.reviewId },
    });
  });
}
