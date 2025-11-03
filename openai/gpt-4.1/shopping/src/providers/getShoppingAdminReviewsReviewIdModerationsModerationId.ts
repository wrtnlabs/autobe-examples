import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingReviewModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingReviewModeration";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingAdminReviewsReviewIdModerationsModerationId(props: {
  admin: AdminPayload;
  reviewId: string & tags.Format<"uuid">;
  moderationId: string & tags.Format<"uuid">;
}): Promise<IShoppingReviewModeration> {
  const moderation =
    await MyGlobal.prisma.shopping_review_moderations.findFirst({
      where: {
        id: props.moderationId,
        shopping_review_id: props.reviewId,
        // deleted_at removed: field does not exist in this model
      },
    });
  if (!moderation) {
    throw new HttpException("Moderation record not found", 404);
  }
  return {
    id: moderation.id,
    shopping_review_id: moderation.shopping_review_id,
    moderator_admin_id: moderation.moderator_admin_id,
    action: moderation.action,
    reason: moderation.reason ?? undefined,
    created_at: toISOStringSafe(moderation.created_at),
  };
}
