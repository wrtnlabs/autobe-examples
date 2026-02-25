import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteEcommerceSellerProductsProductIdReviewsReviewIdSellerResponse(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  reviewId: string & tags.Format<"uuid">;
}): Promise<void> {
  // First verify the review exists for the specified product
  const review = await MyGlobal.prisma.ecommerce_reviews.findUnique({
    where: {
      id: props.reviewId,
      ecommerce_product_id: props.productId,
      is_deleted: false,
    },
    select: { id: true },
  });
  if (!review) {
    throw new HttpException("Review not found", 404);
  }
  // Atomically delete the response with seller verification
  const deleted = await MyGlobal.prisma.ecommerce_review_responses.deleteMany({
    where: {
      ecommerce_review_id: review.id,
      seller_id: props.seller.id,
    },
  });
  // If no rows deleted, check if response exists for proper error
  if (deleted.count === 0) {
    const existingResponse =
      await MyGlobal.prisma.ecommerce_review_responses.findUnique({
        where: { ecommerce_review_id: review.id },
      });
    if (existingResponse) {
      // Response exists but seller doesn't own it
      throw new HttpException("Forbidden", 403);
    }
    // Response doesn't exist - silent success (idempotent)
  }
}
