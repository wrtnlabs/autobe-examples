import { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallReviewTransformer } from "../transformers/EcommerceMallReviewTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallCustomerReviewsReviewId(props: {
  customer: CustomerPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IEcommerceMallReview.IUpdate;
}): Promise<IEcommerceMallReview> {
  // Fetch review by ID
  const review = await MyGlobal.prisma.ecommerce_mall_reviews.findUniqueOrThrow(
    {
      where: { id: props.reviewId },
      select: {
        id: true,
        customer_id: true,
        product_id: true,
        order_id: true,
        rating: true,
        title: true,
        body: true,
        is_verified_purchase: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    },
  );
  // Verify ownership
  if (review.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Check if review is soft-deleted
  if (review.deleted_at !== null) {
    throw new HttpException("Review is already deleted", 400);
  }
  // Validate rating if provided
  if (props.body.rating !== undefined) {
    if (
      !Number.isInteger(props.body.rating) ||
      props.body.rating < 1 ||
      props.body.rating > 5
    ) {
      throw new HttpException("Rating must be an integer between 1 and 5", 400);
    }
  }
  // Create snapshot before update
  const snapshotId = v4();
  const oldData = {
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
    deleted_at:
      review.deleted_at !== null ? toISOStringSafe(review.deleted_at) : null,
  };
  // Build new_data with updated values
  const newData = {
    id: review.id,
    customer_id: review.customer_id,
    product_id: review.product_id,
    order_id: review.order_id,
    rating: props.body.rating ?? review.rating,
    title: props.body.title ?? review.title,
    body: props.body.body ?? review.body,
    is_verified_purchase: review.is_verified_purchase,
    created_at: toISOStringSafe(review.created_at),
    updated_at: toISOStringSafe(new Date()),
    deleted_at:
      review.deleted_at !== null ? toISOStringSafe(review.deleted_at) : null,
  };
  await MyGlobal.prisma.ecommerce_mall_review_snapshots.create({
    data: {
      id: snapshotId,
      ecommerce_mall_review_id: review.id,
      customer_id: props.customer.id,
      changed_by_type: "customer",
      changed_by_id: props.customer.id,
      snapshot_type: "modified",
      old_data: JSON.stringify(oldData),
      new_data: JSON.stringify(newData),
      created_at: new Date(),
    },
  });
  // Build update data with only provided fields
  const updateData: Prisma.ecommerce_mall_reviewsUpdateInput = {
    updated_at: new Date(),
  };
  if (props.body.rating !== undefined) {
    updateData.rating = props.body.rating;
  }
  if (props.body.title !== undefined) {
    updateData.title = props.body.title ?? null;
  }
  if (props.body.body !== undefined) {
    updateData.body = props.body.body;
  }
  // Execute update
  await MyGlobal.prisma.ecommerce_mall_reviews.update({
    where: { id: props.reviewId },
    data: updateData,
  });
  // Fetch updated review with full data
  const updatedReview =
    await MyGlobal.prisma.ecommerce_mall_reviews.findUniqueOrThrow({
      where: { id: props.reviewId },
      ...EcommerceMallReviewTransformer.select(),
    });
  // Transform and return
  return await EcommerceMallReviewTransformer.transform(updatedReview);
}
