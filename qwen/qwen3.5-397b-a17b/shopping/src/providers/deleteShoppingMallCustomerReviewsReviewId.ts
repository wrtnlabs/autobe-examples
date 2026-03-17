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

export async function deleteShoppingMallCustomerReviewsReviewId(props: {
  customer: CustomerPayload;
  reviewId: string & tags.Format<"uuid">;
}): Promise<void> {
  const review = await MyGlobal.prisma.shopping_mall_reviews.findUniqueOrThrow({
    where: { id: props.reviewId },
    select: { id: true, shopping_customer_id: true, deleted: true },
  });
  if (review.shopping_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (review.deleted === true) {
    throw new HttpException("Not Found", 404);
  }
  await MyGlobal.prisma.shopping_mall_reviews.update({
    where: { id: props.reviewId },
    data: {
      deleted: true,
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });
}
