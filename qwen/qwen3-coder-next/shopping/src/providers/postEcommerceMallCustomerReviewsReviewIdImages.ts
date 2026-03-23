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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallReviewImageTransformer } from "../transformers/EcommerceMallReviewImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallCustomerReviewsReviewIdImages(props: {
  customer: CustomerPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IEcommerceMallReviewImage.ICreate;
}): Promise<IEcommerceMallReviewImage> {
  const review = await MyGlobal.prisma.ecommerce_mall_reviews.findUniqueOrThrow(
    {
      where: { id: props.reviewId },
      select: {
        id: true,
        customer_id: true,
        deleted_at: true,
        created_at: true,
      },
    },
  );
  if (review.deleted_at !== null) {
    throw new HttpException("Review not found", 404);
  }
  if (review.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  const existingImages =
    await MyGlobal.prisma.ecommerce_mall_review_images.findMany({
      where: { ecommerce_mall_review_id: props.reviewId },
      select: { sort_order: true },
      orderBy: { sort_order: "desc" },
      take: 1,
    });
  const nextSortOrder =
    existingImages.length > 0 ? existingImages[0].sort_order + 1 : 1;
  const created = await MyGlobal.prisma.ecommerce_mall_review_images.create({
    data: {
      id: v4(),
      image_url: props.body.image_url,
      sort_order: nextSortOrder,
      created_at: new Date(),
      updated_at: new Date(),
      review: { connect: { id: props.reviewId } },
    },
    ...EcommerceMallReviewImageTransformer.select(),
  });
  return await EcommerceMallReviewImageTransformer.transform(created);
}
