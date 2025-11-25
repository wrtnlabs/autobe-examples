import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingMallSellerReviewsReviewIdResponsesResponseId(props: {
  seller: SellerPayload;
  reviewId: string & tags.Format<"uuid">;
  responseId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Fetch the response for this reviewId/responseId
  const response =
    await MyGlobal.prisma.shopping_mall_review_responses.findUnique({
      where: {
        id: props.responseId,
      },
    });

  // Step 2: Ensure the response exists and matches the reviewId
  if (!response || response.shopping_mall_review_id !== props.reviewId) {
    throw new HttpException("Review response not found", 404);
  }

  // Step 3: Check if already deleted (soft-delete semantics)
  if (response.deleted_at !== null) {
    throw new HttpException("Review response has already been deleted", 410);
  }

  // Step 4: Ensure seller is the owner
  if (response.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException(
      "You do not have permission to delete this response",
      403,
    );
  }

  // Step 5: Perform the soft delete
  await MyGlobal.prisma.shopping_mall_review_responses.update({
    where: { id: props.responseId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
