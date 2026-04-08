import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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
  // Find review and verify ownership
  const review = await MyGlobal.prisma.ecommerce_mall_reviews.findUniqueOrThrow(
    {
      where: { id: props.reviewId },
      select: {
        id: true,
        customer_id: true,
        rating: true,
        content: true,
        deleted_at: true,
      },
    },
  );
  // Verify ownership
  if (review.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify not deleted
  if (review.deleted_at !== null) {
    throw new HttpException("Review has been deleted", 400);
  }
  // Create snapshot before update
  await MyGlobal.prisma.ecommerce_mall_review_snapshots.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      ecommerce_mall_review_id: review.id,
      rating: review.rating,
      content: review.content,
      created_at: new Date(),
    },
  });
  // Update review
  await MyGlobal.prisma.ecommerce_mall_reviews.update({
    where: { id: props.reviewId },
    data: {
      ...(props.body.rating !== undefined && { rating: props.body.rating }),
      ...(props.body.content !== undefined && { content: props.body.content }),
      updated_at: new Date(),
    },
  });
  // Fetch updated review with transformer select
  const updated =
    await MyGlobal.prisma.ecommerce_mall_reviews.findUniqueOrThrow({
      where: { id: props.reviewId },
      ...EcommerceMallReviewTransformer.select(),
    });
  return await EcommerceMallReviewTransformer.transform(updated);
}
