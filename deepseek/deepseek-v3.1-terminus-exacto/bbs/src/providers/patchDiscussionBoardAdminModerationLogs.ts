import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import { IDiscussionBoardModeratedContentHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModeratedContentHistory";
import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import { IPageIDiscussionBoardModeratedContentHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModeratedContentHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminModerationLogs(props: {
  admin: AdminPayload;
  body: IDiscussionBoardModeratedContentHistory.IRequest;
}): Promise<IPageIDiscussionBoardModeratedContentHistory.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE conditions with proper Prisma syntax
  const whereInput = {
    deleted_at: null,
    ...(props.body.action_type && { action_type: props.body.action_type }),
    ...(props.body.admin_id && { admin_id: props.body.admin_id }),
    ...(props.body.super_admin_id && {
      super_admin_id: props.body.super_admin_id,
    }),
    ...(props.body.target_article_id && {
      target_article_id: props.body.target_article_id,
    }),
    ...(props.body.target_comment_id && {
      target_comment_id: props.body.target_comment_id,
    }),
    ...(props.body.target_user_id && {
      target_user_id: props.body.target_user_id,
    }),
    ...(props.body.target_section_id && {
      target_section_id: props.body.target_section_id,
    }),
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.action_description && {
      action_description: {
        contains: props.body.action_description,
        mode: "insensitive",
      },
    }),
    performed_at: {
      ...(props.body.performed_at_from && {
        gte: props.body.performed_at_from,
      }),
      ...(props.body.performed_at_to && { lte: props.body.performed_at_to }),
    },
    created_at: {
      ...(props.body.created_at_from && { gte: props.body.created_at_from }),
      ...(props.body.created_at_to && { lte: props.body.created_at_to }),
    },
  } satisfies Prisma.discussion_board_moderation_logsWhereInput;
  const data = await MyGlobal.prisma.discussion_board_moderation_logs.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { performed_at: "desc" },
    include: {
      admin: {
        select: {
          id: true,
          email: true,
          display_name: true,
          created_at: true,
        },
      },
      superAdmin: {
        select: {
          id: true,
          privilege_level: true,
          created_at: true,
        },
      },
    },
  });
  const total = await MyGlobal.prisma.discussion_board_moderation_logs.count({
    where: whereInput,
  });
  const transformedData = data.map((log) => {
    const adminSummary = log.admin
      ? ({
          id: log.admin.id,
          email: log.admin.email,
          display_name: log.admin.display_name,
          created_at: toISOStringSafe(log.admin.created_at),
        } satisfies IDiscussionBoardAdmin.ISummary)
      : null;
    const superAdminSummary = log.superAdmin
      ? ({
          id: log.superAdmin.id,
          permission_level: log.superAdmin.privilege_level,
          assignment_date: toISOStringSafe(log.superAdmin.created_at),
          admin: null,
          superAdmin: null,
        } satisfies IDiscussionBoardSuperAdmin.ISummary)
      : null;
    return {
      id: log.id,
      action_type: log.action_type,
      action_description: log.action_description,
      performed_at: toISOStringSafe(log.performed_at),
      status: log.status,
      admin: adminSummary,
      super_admin: superAdminSummary,
    } satisfies IDiscussionBoardModeratedContentHistory.ISummary;
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  } satisfies IPageIDiscussionBoardModeratedContentHistory.ISummary;
}
