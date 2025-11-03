import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallReviewModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewModerationQueue";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminReviewModerationQueuesId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IShoppingMallReviewModerationQueue> {
  const { id } = props;

  const record =
    await MyGlobal.prisma.shopping_mall_review_moderation_queues.findUnique({
      where: { id },
    });

  if (record === null || record.deleted_at !== null) {
    throw new HttpException("Review moderation queue entry not found", 404);
  }

  return {
    id: record.id,
    shopping_mall_product_review_id: record.shopping_mall_product_review_id,
    flagged_reason: record.flagged_reason,
    moderator_notes: record.moderator_notes ?? null,
    status: record.status,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
