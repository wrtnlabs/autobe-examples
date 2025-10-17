import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallReviewImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewImage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerReviewsReviewIdImages(props: {
  customer: CustomerPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IShoppingMallReviewImage.ICreate;
}): Promise<IShoppingMallReviewImage> {
  const { customer, reviewId, body } = props;

  // Verify review exists and customer owns it
  const review = await MyGlobal.prisma.shopping_mall_reviews.findFirst({
    where: {
      id: reviewId,
      deleted_at: null,
    },
  });

  if (!review) {
    throw new HttpException("Review not found", 404);
  }

  // Authorization: Verify customer owns the review
  if (review.shopping_mall_customer_id !== customer.id) {
    throw new HttpException(
      "Unauthorized: You can only upload images to your own reviews",
      403,
    );
  }

  // Check existing image count (max 5 images per review)
  const existingImageCount =
    await MyGlobal.prisma.shopping_mall_review_images.count({
      where: {
        shopping_mall_review_id: reviewId,
      },
    });

  if (existingImageCount >= 5) {
    throw new HttpException("Maximum 5 images allowed per review", 400);
  }

  // Create the review image
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.shopping_mall_review_images.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_review_id: reviewId,
      image_url: body.image_url,
      display_order: body.display_order,
      created_at: now,
    },
  });

  return {
    id: created.id as string & tags.Format<"uuid">,
    shopping_mall_review_id: created.shopping_mall_review_id as string &
      tags.Format<"uuid">,
    image_url: created.image_url,
    display_order: created.display_order,
    created_at: now,
  };
}
