import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
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
  const review = await MyGlobal.prisma.ecommerce_mall_reviews.findUniqueOrThrow(
    {
      where: { id: props.reviewId },
      select: {
        id: true,
        customer_id: true,
        product_id: true,
        rating: true,
        text_content: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        customer: {
          select: {
            id: true,
            email: true,
            is_banned: true,
            created_at: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            base_price: true,
            category: {
              select: {
                id: true,
                name: true,
                description: true,
                parent: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    is_leaf: true,
                    created_at: true,
                    deleted_at: true,
                  },
                },
                is_leaf: true,
              },
            },
            seller: {
              select: {
                id: true,
                email: true,
                approval_status: true,
                rejection_reason: true,
                is_suspended: true,
                is_banned: true,
                created_at: true,
                updated_at: true,
              },
            },
          },
        },
      },
    },
  );
  if (review.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (!review.is_active) {
    throw new HttpException("Review not found", 404);
  }
  if (
    props.body.rating !== undefined &&
    (props.body.rating < 1 || props.body.rating > 5)
  ) {
    throw new HttpException("Rating must be between 1 and 5", 400);
  }
  const now = new Date();
  await MyGlobal.prisma.ecommerce_mall_snapshot_audits.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      record_type: "ecommerce_mall_reviews" as const,
      record_id: props.reviewId,
      changes: "rating,text_content",
      old_values: JSON.stringify({
        rating: review.rating,
        textContent: review.text_content ?? null,
      }),
      new_values: JSON.stringify({
        rating: props.body.rating ?? review.rating,
        textContent: props.body.text_content ?? review.text_content,
      }),
      changed_at: now,
      changed_by: props.customer.id,
      created_at: now,
      updated_at: now,
    },
  });
  await MyGlobal.prisma.ecommerce_mall_reviews.update({
    where: { id: props.reviewId },
    data: {
      ...(props.body.rating !== undefined && { rating: props.body.rating }),
      ...(props.body.text_content !== undefined && {
        text_content: props.body.text_content,
      }),
      updated_at: now,
    },
  });
  const updatedReview =
    await MyGlobal.prisma.ecommerce_mall_reviews.findUniqueOrThrow({
      where: { id: props.reviewId },
      ...EcommerceMallReviewTransformer.select(),
    });
  return await EcommerceMallReviewTransformer.transform(updatedReview);
}
