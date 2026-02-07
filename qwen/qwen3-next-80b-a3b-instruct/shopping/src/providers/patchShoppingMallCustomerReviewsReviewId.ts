import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
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

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchShoppingMallCustomerReviewsReviewId(props: {
  customer: CustomerPayload;
  reviewId: string;
  body: IShoppingMallReview.IUpdate;
}): Promise<IShoppingMallReview> {
  const review = await MyGlobal.prisma.shopping_mall_reviews.findUnique({
    where: {
      id: props.reviewId,
      shopping_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
    select: {
      id: true,
      rating: true,
      text: true,
      created_at: true,
      updated_at: true,
    },
  });
  if (!review) {
    throw new HttpException("Review not found or not authorized", 404);
  }
  const updateFields: {
    rating?: number;
    text?: string | null;
    updated_at?: string & tags.Format<"date-time">;
  } = {};
  if (props.body.rating !== undefined) {
    updateFields.rating = props.body.rating;
  }
  if (props.body.text !== undefined) {
    updateFields.text = props.body.text;
  }
  if (Object.keys(updateFields).length === 0) {
    return {
      id: review.id,
      rating: review.rating,
      text: review.text,
      created_at: toISOStringSafe(review.created_at),
      updated_at: review.updated_at ? toISOStringSafe(review.updated_at) : null,
    };
  }
  // Create snapshot before update
  await MyGlobal.prisma.shopping_mall_review_snapshots.create({
    data: {
      id: v4(),
      review_id: review.id,
      rating: review.rating,
      text: review.text,
      created_at: toISOStringSafe(review.created_at),
      updated_at: review.updated_at ? toISOStringSafe(review.updated_at) : null,
      snapshot_at: toISOStringSafe(new Date()),
      actor_id: props.customer.id,
      actor_type: "customer",
    },
  });
  const updated = await MyGlobal.prisma.shopping_mall_reviews.update({
    where: { id: props.reviewId },
    data: {
      ...updateFields,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  return {
    id: updated.id,
    rating: updated.rating,
    text: updated.text,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: updated.updated_at ? toISOStringSafe(updated.updated_at) : null,
  };
}
