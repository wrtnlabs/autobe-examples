import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallReviewImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewImage";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

export async function deleteShoppingMallBuyerReviewsReviewIdImagesImageId(props: {
  buyer: BuyerPayload;
  reviewId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallReviewImage> {
  const review = await MyGlobal.prisma.shopping_mall_reviews.findFirst({
    where: {
      id: props.reviewId,
      shopping_mall_buyer_id: props.buyer.id,
      deleted_at: null,
    },
  });

  if (!review) {
    throw new HttpException("Review not found", 404);
  }

  const image = await MyGlobal.prisma.shopping_mall_review_images.findFirst({
    where: {
      id: props.imageId,
      shopping_mall_review_id: props.reviewId,
    },
  });

  if (!image) {
    throw new HttpException("Image not found", 404);
  }

  await MyGlobal.prisma.shopping_mall_review_images.delete({
    where: {
      id: props.imageId,
    },
  });

  return {
    id: image.id,
    shopping_mall_review_id: image.shopping_mall_review_id,
    image_url: image.image_url,
    thumbnail_url: image.thumbnail_url,
    medium_url: image.medium_url,
    display_order: image.display_order,
    created_at: toISOStringSafe(image.created_at),
  };
}
