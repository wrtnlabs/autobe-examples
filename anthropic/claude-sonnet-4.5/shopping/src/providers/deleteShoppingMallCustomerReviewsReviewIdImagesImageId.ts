import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerReviewsReviewIdImagesImageId(props: {
  customer: CustomerPayload;
  reviewId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { customer, reviewId, imageId } = props;

  // Fetch the review image with its parent review for authorization
  const reviewImage =
    await MyGlobal.prisma.shopping_mall_review_images.findUniqueOrThrow({
      where: { id: imageId },
      include: {
        review: {
          select: {
            id: true,
            shopping_mall_customer_id: true,
          },
        },
      },
    });

  // Verify the image belongs to the specified review
  if (reviewImage.shopping_mall_review_id !== reviewId) {
    throw new HttpException(
      "Image does not belong to the specified review",
      404,
    );
  }

  // Authorization: Only the review author can delete their review images
  if (reviewImage.review.shopping_mall_customer_id !== customer.id) {
    throw new HttpException(
      "Unauthorized: You can only delete images from your own reviews",
      403,
    );
  }

  // Perform hard delete (schema has no deleted_at field for review images)
  await MyGlobal.prisma.shopping_mall_review_images.delete({
    where: { id: imageId },
  });
}
