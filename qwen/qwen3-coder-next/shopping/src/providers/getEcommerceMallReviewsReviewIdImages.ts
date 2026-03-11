import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import { IEcommerceMallReviewImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReviewImage";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallReviewImageTransformer } from "../transformers/EcommerceMallReviewImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallReviewsReviewIdImages(props: {
  actor: {
    role: "customer" | "seller" | "admin";
    id: string;
  };
  reviewId: string;
}): Promise<IEcommerceMallReviewImage[]> {
  const review = await MyGlobal.prisma.ecommerce_mall_reviews.findUniqueOrThrow(
    {
      where: { id: props.reviewId },
      select: { order_item_id: true, product_id: true, customer_id: true },
    },
  );
  // Authorization: customer
  if (props.actor.role === "customer") {
    if (review.customer_id !== props.actor.id) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // Authorization: seller
  if (props.actor.role === "seller") {
    const product =
      await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
        where: { id: review.product_id },
        select: { seller_id: true },
      });
    if (product.seller_id !== props.actor.id) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // Admin has access to all
  const images = await MyGlobal.prisma.ecommerce_mall_review_images.findMany({
    where: { ecommerce_mall_review_id: props.reviewId },
    orderBy: { sort_order: "asc" },
    ...EcommerceMallReviewImageTransformer.select(),
  });
  return await ArrayUtil.asyncMap(
    images,
    EcommerceMallReviewImageTransformer.transform,
  );
}
