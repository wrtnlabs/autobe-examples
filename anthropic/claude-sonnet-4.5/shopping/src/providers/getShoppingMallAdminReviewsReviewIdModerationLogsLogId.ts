import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallReviewModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewModerationLog";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminReviewsReviewIdModerationLogsLogId(props: {
  admin: AdminPayload;
  reviewId: string & tags.Format<"uuid">;
  logId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallReviewModerationLog> {
  const log =
    await MyGlobal.prisma.shopping_mall_review_moderation_logs.findUnique({
      where: { id: props.logId },
    });

  if (!log) {
    throw new HttpException("Moderation log not found", 404);
  }

  if (log.shopping_mall_review_id !== props.reviewId) {
    throw new HttpException(
      "Moderation log does not belong to the specified review",
      404,
    );
  }

  let adminSummary: IShoppingMallAdmin.ISummary | null = null;

  if (log.shopping_mall_admin_id !== null) {
    const admin = await MyGlobal.prisma.shopping_mall_admins.findUnique({
      where: { id: log.shopping_mall_admin_id },
    });

    if (!admin) {
      throw new HttpException("Associated admin not found", 404);
    }

    adminSummary = {
      id: admin.id,
      email: admin.email,
      full_name: admin.full_name,
      phone_number: admin.phone_number,
      admin_level: typia.assert<"super_admin" | "moderator" | "support">(
        admin.admin_level,
      ),
      email_verified: admin.email_verified,
      created_at: toISOStringSafe(admin.created_at),
      updated_at: toISOStringSafe(admin.updated_at),
      deleted_at: admin.deleted_at ? toISOStringSafe(admin.deleted_at) : null,
    };
  }

  if (adminSummary === null) {
    throw new HttpException(
      "Admin information is required for moderation log",
      500,
    );
  }

  return {
    id: log.id,
    shopping_mall_review_id: log.shopping_mall_review_id,
    shopping_mall_admin_id: log.shopping_mall_admin_id ?? undefined,
    admin: adminSummary,
    action_type: typia.assert<
      | "auto_approved"
      | "auto_flagged"
      | "manual_approved"
      | "manual_rejected"
      | "edited_by_admin"
      | "deleted_by_admin"
      | "deleted_by_buyer"
      | "restored"
    >(log.action_type),
    previous_status:
      log.previous_status !== null && log.previous_status !== undefined
        ? typia.assert<"approved" | "rejected" | "pending_moderation">(
            log.previous_status,
          )
        : (log.previous_status ?? undefined),
    new_status:
      log.new_status !== null
        ? typia.assert<"approved" | "rejected" | "pending_moderation">(
            log.new_status,
          )
        : typia.assert<"approved" | "rejected" | "pending_moderation">(
            "pending_moderation",
          ),
    moderation_reason: log.moderation_reason ?? undefined,
    system_flags: log.system_flags ?? undefined,
    created_at: toISOStringSafe(log.created_at),
  };
}
