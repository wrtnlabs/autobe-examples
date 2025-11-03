import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingAdminReviewsReviewIdAttachmentsAttachmentId(props: {
  admin: AdminPayload;
  reviewId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the attachment by ID and review ID to ensure it exists
  const attachment =
    await MyGlobal.prisma.shopping_review_attachments.findFirst({
      where: {
        id: props.attachmentId,
        shopping_review_id: props.reviewId,
      },
    });
  if (!attachment) {
    throw new HttpException("Attachment not found", 404);
  }
  // Perform hard delete
  await MyGlobal.prisma.shopping_review_attachments.delete({
    where: { id: props.attachmentId },
  });
}
