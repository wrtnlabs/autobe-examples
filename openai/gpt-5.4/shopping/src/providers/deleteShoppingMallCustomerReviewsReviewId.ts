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
    select: {
      id: true,
      shopping_mall_customer_id: true,
      shopping_mall_product_id: true,
    },
  });
  if (review.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  const now = new Date();
  await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.shopping_mall_reviews.update({
      where: { id: props.reviewId },
      data: {
        deleted_at: now,
        updated_at: now,
      },
    });
    await prisma.shopping_mall_reviews.aggregate({
      where: {
        shopping_mall_product_id: review.shopping_mall_product_id,
        deleted_at: null,
      },
      _avg: {
        rating: true,
      },
      _count: {
        rating: true,
      },
    });
  });
}
