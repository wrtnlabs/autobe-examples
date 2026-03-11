import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallCustomerReviewsReviewIdSnapshots(props: {
  customer: CustomerPayload;
  reviewId: string;
}): Promise<IEcommerceMallReview> {
  const review = await MyGlobal.prisma.ecommerce_mall_reviews.findFirst({
    where: {
      id: props.reviewId,
      customer_id: props.customer.id,
    },
  });
  if (!review) {
    throw new HttpException("Review not found", 404);
  }
  const snapshots =
    await MyGlobal.prisma.ecommerce_mall_review_snapshots.findMany({
      where: {
        review: {
          id: props.reviewId,
        },
      },
      orderBy: {
        created_at: "desc",
      },
    });
  const snapshot = snapshots[0];
  return {
    id: snapshot.id,
    rating: snapshot.rating,
    text_content: snapshot.text_content ?? null,
    snapshot_type: snapshot.snapshot_type,
    created_at: toISOStringSafe(snapshot.created_at),
    review: {
      id: review.id,
      customer_id: review.customer_id,
      product_id: review.product_id,
      created_at: toISOStringSafe(review.created_at),
      updated_at: toISOStringSafe(review.updated_at),
      deleted_at: review.deleted_at ? toISOStringSafe(review.deleted_at) : null,
    } as unknown as IEcommerceMallReview["review"],
  };
}
