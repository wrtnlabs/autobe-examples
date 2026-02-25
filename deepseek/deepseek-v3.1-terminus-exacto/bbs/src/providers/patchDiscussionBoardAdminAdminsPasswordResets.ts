import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminPasswordReset";
import { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminPasswordReset";
import { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardAdminPasswordResetAtSummaryTransformer } from "../transformers/DiscussionBoardAdminPasswordResetAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminAdminsPasswordResets(props: {
  admin: AdminPayload;
  body: IDiscussionBoardAdminPasswordReset.IRequest;
}): Promise<IPageIDiscussionBoardAdminPasswordReset.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Helper function for status conditions
  const buildStatusCondition = (status?: string | null) => {
    if (!status) return {};
    const now = new Date().toISOString();
    switch (status) {
      case "pending":
        return {
          used_at: null,
          expires_at: { gt: now },
        };
      case "used":
        return {
          used_at: { not: null },
        };
      case "expired":
        return {
          used_at: null,
          expires_at: { lte: now },
        };
      default:
        return {};
    }
  };
  // Helper function for date range conditions
  const buildDateRangeConditions = (
    body: IDiscussionBoardAdminPasswordReset.IRequest,
  ) => {
    const conditions: any = {};
    if (body.created_at_start && body.created_at_end) {
      conditions.created_at = {
        gte: body.created_at_start,
        lte: body.created_at_end,
      };
    } else if (body.created_at_start) {
      conditions.created_at = { gte: body.created_at_start };
    } else if (body.created_at_end) {
      conditions.created_at = { lte: body.created_at_end };
    }
    if (body.expires_at_start && body.expires_at_end) {
      conditions.expires_at = {
        gte: body.expires_at_start,
        lte: body.expires_at_end,
      };
    } else if (body.expires_at_start) {
      conditions.expires_at = { gte: body.expires_at_start };
    } else if (body.expires_at_end) {
      conditions.expires_at = { lte: body.expires_at_end };
    }
    return conditions;
  };
  // Build WHERE conditions
  const whereConditions = {
    admin: {
      ...(props.body.email && { email: { contains: props.body.email } }),
      deleted_at: null,
    },
    ...buildStatusCondition(props.body.status),
    ...buildDateRangeConditions(props.body),
  } satisfies Prisma.discussion_board_admin_password_resetsWhereInput;
  // Query data with pagination
  const data =
    await MyGlobal.prisma.discussion_board_admin_password_resets.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...DiscussionBoardAdminPasswordResetAtSummaryTransformer.select(),
    });
  // Query total count
  const total =
    await MyGlobal.prisma.discussion_board_admin_password_resets.count({
      where: whereConditions,
    });
  // Transform data
  const transformed = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardAdminPasswordResetAtSummaryTransformer.transform,
  );
  return {
    data: transformed,
    pagination: {
      pagination: {
        pagination: {
          pagination: {
            pagination: {
              current: page satisfies number as number &
                tags.Type<"int32"> &
                tags.Minimum<0>,
              limit: limit satisfies number as number &
                tags.Type<"int32"> &
                tags.Minimum<0>,
              records: total satisfies number as number &
                tags.Type<"int32"> &
                tags.Minimum<0>,
              pages: Math.ceil(total / limit) satisfies number as number &
                tags.Type<"int32"> &
                tags.Minimum<0>,
            } satisfies IPage.IPagination,
            data: [] satisfies IDiscussionBoardSection.IPagination[],
          } satisfies IPageIDiscussionBoardSection.IPagination,
          data: [] satisfies IDiscussionBoardAdministratorPromotionRequest.IPagination[],
        } satisfies IPageIDiscussionBoardAdministratorPromotionRequest.IPagination,
        data: [] satisfies IDiscussionBoardAdministratorDistributionStatistic.IPagination[],
      } satisfies IPageIDiscussionBoardAdministratorDistributionStatistic.IPagination,
      data: transformed satisfies IDiscussionBoardAdminPasswordReset.ISummary[],
    } satisfies IPageIDiscussionBoardAdminPasswordReset.ISummary,
  };
}
