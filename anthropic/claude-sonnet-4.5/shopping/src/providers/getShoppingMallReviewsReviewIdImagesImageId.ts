import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallReviewImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewImage";

export async function getShoppingMallReviewsReviewIdImagesImageId(props: {
  reviewId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallReviewImage> {
  const image = await MyGlobal.prisma.shopping_mall_review_images.findUnique({
    where: {
      id: props.imageId,
    },
  });

  if (!image) {
    throw new HttpException("Review image not found", 404);
  }

  if (image.shopping_mall_review_id !== props.reviewId) {
    throw new HttpException("Review image not found", 404);
  }

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
