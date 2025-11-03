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

export async function postShoppingAdminReviewsReviewIdModerations(props: {
  admin: AdminPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IShoppingReviewModeration.ICreate;
}): Promise<IShoppingReviewModeration> {
  const review = await MyGlobal.prisma.shopping_reviews.findFirst({
    where: {
      id: props.reviewId,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!review) {
    throw new HttpException("Review not found", 404);
  }

  const id = v4();
  const now = toISOStringSafe(new Date());

  const moderation = await MyGlobal.prisma.shopping_review_moderations.create({
    data: {
      id,
      shopping_review_id: props.reviewId,
      moderator_admin_id: props.admin.id,
      action: props.body.action,
      reason: props.body.reason ?? null,
      created_at: now,
    },
    select: {
      id: true,
      shopping_review_id: true,
      moderator_admin_id: true,
      action: true,
      reason: true,
      created_at: true,
    },
  });

  return {
    id: moderation.id,
    shopping_review_id: moderation.shopping_review_id,
    moderator_admin_id: moderation.moderator_admin_id,
    action: moderation.action,
    reason: moderation.reason ?? undefined,
    created_at: toISOStringSafe(moderation.created_at),
  };
}
