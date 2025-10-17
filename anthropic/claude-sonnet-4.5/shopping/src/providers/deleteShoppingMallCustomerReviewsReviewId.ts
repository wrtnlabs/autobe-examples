import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerReviewsReviewId(props: {
  customer: CustomerPayload;
  reviewId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { customer, reviewId } = props;

  const review = await MyGlobal.prisma.shopping_mall_reviews.findUniqueOrThrow({
    where: { id: reviewId },
    select: {
      id: true,
      shopping_mall_customer_id: true,
    },
  });

  if (review.shopping_mall_customer_id !== customer.id) {
    throw new HttpException(
      "Unauthorized: You can only delete your own reviews",
      403,
    );
  }

  await MyGlobal.prisma.shopping_mall_reviews.update({
    where: { id: reviewId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
