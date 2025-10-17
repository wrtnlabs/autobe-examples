import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminReviewsReviewIdImagesImageId(props: {
  admin: AdminPayload;
  reviewId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, reviewId, imageId } = props;

  // Verify the review exists
  await MyGlobal.prisma.shopping_mall_reviews.findUniqueOrThrow({
    where: { id: reviewId },
  });

  // Verify the image exists and belongs to the specified review
  const image =
    await MyGlobal.prisma.shopping_mall_review_images.findUniqueOrThrow({
      where: { id: imageId },
    });

  // Authorization check: verify image belongs to the specified review
  if (image.shopping_mall_review_id !== reviewId) {
    throw new HttpException(
      "Image does not belong to the specified review",
      403,
    );
  }

  // Perform hard delete (schema has no deleted_at field)
  await MyGlobal.prisma.shopping_mall_review_images.delete({
    where: { id: imageId },
  });

  // Recalculate display_order for remaining images
  const remainingImages =
    await MyGlobal.prisma.shopping_mall_review_images.findMany({
      where: { shopping_mall_review_id: reviewId },
      orderBy: { display_order: "asc" },
    });

  // Update display_order to maintain sequential ordering (1, 2, 3...)
  await Promise.all(
    remainingImages.map((img, index) =>
      MyGlobal.prisma.shopping_mall_review_images.update({
        where: { id: img.id },
        data: { display_order: index + 1 },
      }),
    ),
  );
}
