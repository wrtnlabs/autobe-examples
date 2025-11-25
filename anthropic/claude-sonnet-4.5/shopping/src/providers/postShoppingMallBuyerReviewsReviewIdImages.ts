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

export async function postShoppingMallBuyerReviewsReviewIdImages(props: {
  buyer: BuyerPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IShoppingMallReviewImage.ICreate;
}): Promise<IShoppingMallReviewImage> {
  const review = await MyGlobal.prisma.shopping_mall_reviews.findUnique({
    where: { id: props.reviewId },
  });

  if (!review || review.deleted_at !== null) {
    throw new HttpException("Review not found", 404);
  }

  if (review.shopping_mall_buyer_id !== props.buyer.id) {
    throw new HttpException("Forbidden", 403);
  }

  const created = await MyGlobal.prisma.shopping_mall_review_images.create({
    data: {
      id: v4(),
      shopping_mall_review_id: props.reviewId,
      image_url: props.body.image_url,
      thumbnail_url: props.body.thumbnail_url,
      medium_url: props.body.medium_url,
      display_order: props.body.display_order,
      created_at: new Date(),
    },
  });

  return {
    id: created.id,
    shopping_mall_review_id: created.shopping_mall_review_id,
    image_url: created.image_url,
    thumbnail_url: created.thumbnail_url,
    medium_url: created.medium_url,
    display_order: created.display_order,
    created_at: toISOStringSafe(created.created_at),
  };
}
