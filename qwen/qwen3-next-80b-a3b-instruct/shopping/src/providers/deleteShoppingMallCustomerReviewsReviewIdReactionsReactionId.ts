import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerReviewsReviewIdReactionsReactionId(props: {
  customer: CustomerPayload;
  reviewId: string;
  reactionId: string;
}): Promise<void> {
  const deleted = await MyGlobal.prisma.shopping_mall_review_reactions.delete({
    where: {
      id: props.reactionId,
      shopping_mall_review_id: props.reviewId,
      shopping_mall_customer_id: props.customer.id,
    },
  });

  if (!deleted) {
    throw new HttpException("Not found", 404);
  }
}
