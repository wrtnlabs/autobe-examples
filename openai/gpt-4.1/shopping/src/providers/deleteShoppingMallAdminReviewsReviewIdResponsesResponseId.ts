import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminReviewsReviewIdResponsesResponseId(props: {
  admin: AdminPayload;
  reviewId: string & tags.Format<"uuid">;
  responseId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Locate the review response by responseId and reviewId, and ensure it's not already deleted
  const response =
    await MyGlobal.prisma.shopping_mall_review_responses.findFirst({
      where: {
        id: props.responseId,
        review: { id: props.reviewId },
        deleted_at: null,
      },
    });
  if (!response) {
    throw new HttpException("Response not found or already deleted.", 404);
  }

  // Set deleted_at to current timestamp string (date-time)
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.shopping_mall_review_responses.update({
    where: {
      id: props.responseId,
    },
    data: {
      deleted_at: now,
    },
  });
}
