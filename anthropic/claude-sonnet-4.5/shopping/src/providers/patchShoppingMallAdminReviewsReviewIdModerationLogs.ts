import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallReviewModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewModerationLog";
import { IPageIShoppingMallReviewModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewModerationLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminReviewsReviewIdModerationLogs(props: {
  admin: AdminPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IShoppingMallReviewModerationLog.IRequest;
}): Promise<IPageIShoppingMallReviewModerationLog.ISummary> {
  const review = await MyGlobal.prisma.shopping_mall_reviews.findUnique({
    where: { id: props.reviewId },
  });

  if (!review) {
    throw new HttpException("Review not found", 404);
  }

  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const whereCondition: Record<string, unknown> = {
    shopping_mall_review_id: props.reviewId,
  };

  if (
    props.body.shopping_mall_admin_id !== undefined &&
    props.body.shopping_mall_admin_id !== null
  ) {
    whereCondition.shopping_mall_admin_id = props.body.shopping_mall_admin_id;
  }

  if (props.body.action_type !== undefined && props.body.action_type !== null) {
    whereCondition.action_type = props.body.action_type;
  }

  if (
    props.body.previous_status !== undefined &&
    props.body.previous_status !== null
  ) {
    whereCondition.previous_status = props.body.previous_status;
  }

  if (props.body.new_status !== undefined && props.body.new_status !== null) {
    whereCondition.new_status = props.body.new_status;
  }

  if (
    props.body.moderation_reason !== undefined &&
    props.body.moderation_reason !== null
  ) {
    whereCondition.moderation_reason = {
      contains: props.body.moderation_reason,
    };
  }

  if (props.body.from !== undefined && props.body.from !== null) {
    whereCondition.created_at = {
      ...(typeof whereCondition.created_at === "object"
        ? whereCondition.created_at
        : {}),
      gte: new Date(props.body.from),
    };
  }

  if (props.body.to !== undefined && props.body.to !== null) {
    whereCondition.created_at = {
      ...(typeof whereCondition.created_at === "object"
        ? whereCondition.created_at
        : {}),
      lte: new Date(props.body.to),
    };
  }

  const sortBy = props.body.sort_by ?? "created_at";
  const order = props.body.order ?? "desc";

  const orderByCondition: Record<string, string> = {
    [sortBy]: order,
  };

  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_review_moderation_logs.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: orderByCondition,
      include: {
        admin: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_review_moderation_logs.count({
      where: whereCondition,
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((log) => {
      if (!log.admin) {
        throw new HttpException("Moderation log admin not found", 500);
      }

      return {
        id: log.id,
        shopping_mall_review_id: log.shopping_mall_review_id,
        shopping_mall_admin_id: log.shopping_mall_admin_id ?? undefined,
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
        previous_status: log.previous_status
          ? typia.assert<"pending_moderation" | "approved" | "rejected">(
              log.previous_status,
            )
          : undefined,
        new_status: typia.assert<
          "pending_moderation" | "approved" | "rejected"
        >(log.new_status!),
        system_flags: log.system_flags ?? undefined,
        created_at: toISOStringSafe(log.created_at),
        moderator: {
          id: log.admin.id,
          email: log.admin.email,
          full_name: log.admin.full_name,
          phone_number: log.admin.phone_number,
          admin_level: typia.assert<"super_admin" | "moderator" | "support">(
            log.admin.admin_level,
          ),
          email_verified: log.admin.email_verified,
          created_at: toISOStringSafe(log.admin.created_at),
          updated_at: toISOStringSafe(log.admin.updated_at),
          deleted_at: log.admin.deleted_at
            ? toISOStringSafe(log.admin.deleted_at)
            : null,
        },
      };
    }),
  };
}
