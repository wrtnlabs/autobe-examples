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

export async function deleteMallPlatformCustomerReviewsReviewId(props: {
  customer: CustomerPayload;
  reviewId: string & tags.Format<"uuid">;
}): Promise<void> {
  const review = await MyGlobal.prisma.mall_platform_reviews.findUniqueOrThrow({
    where: {
      id: props.reviewId,
    },
    select: {
      id: true,
      customer_id: true,
      product_id: true,
      rating: true,
      content: true,
      deleted_at: true,
    },
  });
  if (review.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (review.deleted_at !== null) {
    throw new HttpException("Review already deleted", 400);
  }
  await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.mall_platform_review_snapshots.create({
      data: {
        id: v4(),
        mall_platform_review_id: review.id,
        mall_platform_customer_id: review.customer_id,
        snapshot_action: "delete",
        rating: review.rating,
        content: review.content,
        is_deleted: false,
        created_at: new Date(),
      },
    });
    await prisma.mall_platform_reviews.update({
      where: {
        id: review.id,
      },
      data: {
        deleted_at: new Date(),
        updated_at: new Date(),
      },
    });
    await prisma.mall_platform_reviews.aggregate({
      _avg: {
        rating: true,
      },
      where: {
        product_id: review.product_id,
        deleted_at: null,
      },
    });
  });
}
