import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallReviewImageSet } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewImageSet";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminReviewsReviewIdImages(props: {
  admin: AdminPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IShoppingMallReviewImageSet.IUpdate;
}): Promise<IShoppingMallReviewImageSet> {
  // Delete all existing review images for this review
  await MyGlobal.prisma.shopping_mall_review_images.deleteMany({
    where: {
      shopping_mall_review_id: props.reviewId,
    },
  });

  // Create new review images
  await MyGlobal.prisma.shopping_mall_review_images.createMany({
    data: props.body.images.map((imageUrl) => ({
      shopping_mall_review_id: props.reviewId,
      image_url: imageUrl,
      id: v4(),
      created_at: toISOStringSafe(new Date()),
    })),
  });

  // Return as JSON string to match IShoppingMallReviewImageSet = string
  return JSON.stringify(props.body.images);
}
