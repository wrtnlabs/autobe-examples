import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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
  const review = await MyGlobal.prisma.shopping_mall_reviews.findUnique({
    where: { id: props.reviewId },
  });

  if (!review) {
    throw new HttpException("Review not found", 404);
  }

  if (review.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException(
      "Forbidden: You can only attach images to your own reviews",
      403,
    );
  }

  if (review.deleted_at !== null) {
    throw new HttpException("Review has been deleted", 410);
  }

  const createdImage = await MyGlobal.prisma.shopping_mall_review_images.create(
    {
      data: {
        id: v4(),
        shopping_mall_review_id: props.reviewId,
        image_url: props.body,
        created_at: toISOStringSafe(new Date()),
      },
    },
  );

  return createdImage.image_url;
}
