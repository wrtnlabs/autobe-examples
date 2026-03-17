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
  const review = await MyGlobal.prisma.ecommerce_mall_reviews.findUniqueOrThrow(
    {
      where: { id: props.reviewId },
    },
  );
  if (review.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  if (review.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  const snapshotData = {
    id: v4() as string & tags.Format<"uuid">,
    ecommerce_mall_review_id: props.reviewId,
    customer_id: props.customer.id,
    changed_by_type: "customer",
    changed_by_id: props.customer.id,
    snapshot_type: "deleted",
    old_data: null,
    new_data: JSON.stringify({
      id: review.id,
      customer_id: review.customer_id,
      product_id: review.product_id,
      order_id: review.order_id,
      rating: review.rating,
      title: review.title,
      body: review.body,
      is_verified_purchase: review.is_verified_purchase,
      created_at: toISOStringSafe(review.created_at),
      updated_at: toISOStringSafe(review.updated_at),
      deleted_at: null,
    }),
    created_at: new Date(),
  };
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.ecommerce_mall_review_snapshots.create({
      data: snapshotData,
    }),
    MyGlobal.prisma.ecommerce_mall_reviews.update({
      where: { id: props.reviewId },
      data: { deleted_at: new Date() },
    }),
  ]);
}
