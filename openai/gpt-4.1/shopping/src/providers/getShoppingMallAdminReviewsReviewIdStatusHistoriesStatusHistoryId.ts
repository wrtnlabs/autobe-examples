import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallReviewStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewStatusHistory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminReviewsReviewIdStatusHistoriesStatusHistoryId(props: {
  admin: AdminPayload;
  reviewId: string & tags.Format<"uuid">;
  statusHistoryId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallReviewStatusHistory> {
  const statusHistory =
    await MyGlobal.prisma.shopping_mall_review_status_histories.findFirst({
      where: {
        id: props.statusHistoryId,
        shopping_mall_review_id: props.reviewId,
      },
    });

  if (!statusHistory) {
    throw new HttpException("Status history not found.", 404);
  }

  return {
    id: statusHistory.id,
    shopping_mall_review_id: statusHistory.shopping_mall_review_id,
    status: statusHistory.status,
    reason:
      typeof statusHistory.reason === "undefined"
        ? undefined
        : statusHistory.reason === null
          ? null
          : statusHistory.reason,
    created_at: toISOStringSafe(statusHistory.created_at),
    actor_customer_id:
      typeof statusHistory.actor_customer_id === "undefined"
        ? undefined
        : statusHistory.actor_customer_id === null
          ? null
          : statusHistory.actor_customer_id,
    actor_seller_id:
      typeof statusHistory.actor_seller_id === "undefined"
        ? undefined
        : statusHistory.actor_seller_id === null
          ? null
          : statusHistory.actor_seller_id,
    actor_admin_id:
      typeof statusHistory.actor_admin_id === "undefined"
        ? undefined
        : statusHistory.actor_admin_id === null
          ? null
          : statusHistory.actor_admin_id,
    actor_session_id:
      typeof statusHistory.actor_session_id === "undefined"
        ? undefined
        : statusHistory.actor_session_id === null
          ? null
          : statusHistory.actor_session_id,
  };
}
