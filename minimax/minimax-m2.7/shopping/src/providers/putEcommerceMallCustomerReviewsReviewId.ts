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

export async function putEcommerceMallCustomerReviewsReviewId(props: {
  customer: CustomerPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IEcommerceMallReview.IUpdate;
}): Promise<IEcommerceMallReview> {
  // 1. Find the review with ownership verification
  const review = await MyGlobal.prisma.ecommerce_mall_reviews.findUniqueOrThrow(
    {
      where: { id: props.reviewId },
      select: {
        ...EcommerceMallReviewTransformer.select().select,
        ecommerce_mall_customer_id: true,
      },
    },
  );
  if (review.ecommerce_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Create snapshot of previous state
  await MyGlobal.prisma.ecommerce_mall_review_snapshots.create({
    data: {
      id: v4(),
      ecommerce_mall_review_id: props.reviewId,
      rating: review.rating,
      body: review.content,
      created_at: new Date(),
    },
  });
  // 3. Update the review
  await MyGlobal.prisma.ecommerce_mall_reviews.update({
    where: { id: props.reviewId },
    data: {
      rating: props.body.rating,
      content: props.body.content ?? null,
      updated_at: new Date(),
    },
  });
  // 4. Fetch the updated review with all relations
  const updated =
    await MyGlobal.prisma.ecommerce_mall_reviews.findUniqueOrThrow({
      where: { id: props.reviewId },
      ...EcommerceMallReviewTransformer.select(),
    });
  // 5. Transform to response DTO
  return EcommerceMallReviewTransformer.transform(updated);
}
