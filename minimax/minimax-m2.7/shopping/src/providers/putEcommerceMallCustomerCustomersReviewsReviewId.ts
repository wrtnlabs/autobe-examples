import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import { IEcommerceMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReviewSnapshot";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
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

export async function putEcommerceMallCustomerCustomersReviewsReviewId(props: {
  customer: CustomerPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IEcommerceMallReview.IUpdate;
}): Promise<IEcommerceMallReview> {
  // Find the existing review by reviewId
  const existingReview =
    await MyGlobal.prisma.ecommerce_mall_reviews.findUnique({
      where: { id: props.reviewId },
      select: {
        id: true,
        ecommerce_mall_customer_id: true,
        rating: true,
        content: true,
        deleted_at: true,
      },
    });
  // Validate review exists
  if (existingReview === null) {
    throw new HttpException("Review not found", 404);
  }
  // Validate ownership - customer can only update their own reviews
  if (existingReview.ecommerce_mall_customer_id !== props.customer.id) {
    throw new HttpException("You can only edit your own reviews", 403);
  }
  // Execute within a transaction
  const updatedReview = await MyGlobal.prisma.$transaction(async (tx) => {
    // Create snapshot of current state before update
    await tx.ecommerce_mall_review_snapshots.create({
      data: {
        id: v4(),
        ecommerce_mall_review_id: existingReview.id,
        rating: existingReview.rating,
        body: existingReview.content,
        created_at: new Date(),
      },
    });
    // Update the review with new rating and content
    // Set deleted_at to null to restore if previously deleted
    const updated = await tx.ecommerce_mall_reviews.update({
      where: { id: existingReview.id },
      data: {
        rating: props.body.rating,
        content: props.body.content === null ? null : props.body.content,
        updated_at: new Date(),
        deleted_at: null,
      },
      ...EcommerceMallReviewTransformer.select(),
    });
    return updated;
  });
  // Transform and return the updated review
  return await EcommerceMallReviewTransformer.transform(updatedReview);
}
