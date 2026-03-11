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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallProductsProductIdReviews(props: {
  productId: string;
  body: IEcommerceMallReview.IRequest;
}): Promise<IEcommerceMallReview> {
  const review = await MyGlobal.prisma.ecommerce_mall_reviews.findFirstOrThrow({
    where: {
      product_id: props.productId,
      deleted_at: null,
    },
    select: {
      id: true,
      rating: true,
      text_content: true,
      created_at: true,
      updated_at: true,
      customer_id: true,
      product_id: true,
    },
  });
  await MyGlobal.prisma.ecommerce_mall_review_snapshots.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      ecommerce_mall_review_id: review.id,
      rating: review.rating,
      text_content: review.text_content,
      snapshot_type: "edit",
      created_at: new Date(),
    },
  });
  const updated = await MyGlobal.prisma.ecommerce_mall_reviews.update({
    where: { id: review.id },
    data: {
      rating: props.body.rating,
      text_content: props.body.text_content ?? null,
      updated_at: new Date(),
    },
    select: {
      id: true,
      rating: true,
      text_content: true,
      created_at: true,
      updated_at: true,
      customer_id: true,
      product_id: true,
    },
  });
  return {
    id: updated.id as string & tags.Format<"uuid">,
    rating: updated.rating,
    text_content: updated.text_content ?? null,
    created_at: toISOStringSafe(updated.created_at) as string &
      tags.Format<"date-time">,
    review: {
      id: review.id as string & tags.Format<"uuid">,
      rating: review.rating,
      customer: {
        id: review.customer_id as string & tags.Format<"uuid">,
      } as any,
      product: { id: review.product_id as string & tags.Format<"uuid"> } as any,
      seller: null as any,
      images: [] as any,
      created_at: toISOStringSafe(review.created_at) as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(review.updated_at) as string &
        tags.Format<"date-time">,
    } as any,
    snapshot_type: "edit",
  };
}
