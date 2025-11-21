import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallReviewImageSet } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewImageSet";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerReviewsReviewIdImages(props: {
  customer: CustomerPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IShoppingMallReviewImageSet.IUpdate;
}): Promise<IShoppingMallReviewImageSet> {
  // Verify review exists and belongs to customer
  const review = await MyGlobal.prisma.shopping_mall_reviews.findFirst({
    where: {
      id: props.reviewId,
      shopping_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
  });

  if (!review) {
    throw new HttpException("Review not found or access denied", 404);
  }

  // Delete all existing images for this review
  await MyGlobal.prisma.shopping_mall_review_images.deleteMany({
    where: {
      shopping_mall_review_id: props.reviewId,
    },
  });

  // Create new image records
  await MyGlobal.prisma.shopping_mall_review_images.createMany({
    data: props.body.images.map((image_url) => ({
      id: v4() satisfies string as string,
      shopping_mall_review_id: props.reviewId satisfies string as string,
      image_url: image_url satisfies string as string,
      created_at: toISOStringSafe(new Date()),
    })),
  });

  // Return empty string as required by IShoppingMallReviewImageSet type
  return "";
}
