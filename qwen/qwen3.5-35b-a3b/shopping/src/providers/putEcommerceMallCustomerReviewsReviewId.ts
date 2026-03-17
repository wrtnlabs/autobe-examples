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
  // Step 1: Fetch review with customer_id for ownership verification
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
  // Step 2: Verify customer owns the review
  if (review.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Check review is not soft-deleted
  if (review.deleted_at !== null) {
    throw new HttpException("Cannot update deleted review", 400);
  }
  // Step 4: Validate rating if provided
  if (props.body.rating !== undefined) {
    if (
      !Number.isInteger(props.body.rating) ||
      props.body.rating < 1 ||
      props.body.rating > 5
    ) {
      throw new HttpException("Rating must be an integer between 1 and 5", 400);
    }
  }
  // Step 5: Create snapshot before update
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
      review.deleted_at === null ? null : toISOStringSafe(review.deleted_at),
  };
  const newData = {
    ...oldData,
    rating: props.body.rating ?? review.rating,
    title: props.body.title ?? review.title,
    body: props.body.body ?? review.body,
  };
  await MyGlobal.prisma.ecommerce_mall_review_snapshots.create({
    data: {
      id: v4(),
      snapshot_type: "modified",
      old_data: JSON.stringify(oldData),
      new_data: JSON.stringify(newData),
      changed_by_type: "customer",
      changed_by_id: props.customer.id,
      created_at: new Date(),
      review: { connect: { id: props.reviewId } },
      customer: { connect: { id: props.customer.id } },
    },
  });
  // Step 6: Execute update with conditional fields
  await MyGlobal.prisma.ecommerce_mall_reviews.update({
    where: { id: props.reviewId },
    data: {
      ...(props.body.rating !== undefined && { rating: props.body.rating }),
      ...(props.body.title !== undefined && { title: props.body.title }),
      ...(props.body.body !== undefined && { body: props.body.body }),
      updated_at: new Date(),
    },
  });
  // Step 7: Query updated review with relations
  const updated =
    await MyGlobal.prisma.ecommerce_mall_reviews.findUniqueOrThrow({
      where: { id: props.reviewId },
      ...EcommerceMallReviewTransformer.select(),
    });
  // Step 8: Transform and return
  return await EcommerceMallReviewTransformer.transform(updated);
}
