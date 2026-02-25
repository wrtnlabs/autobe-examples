import { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import { IPageIDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAuditLog";
import { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchDiscussionBoardSuperAdminLogs(props: {
  superAdmin: SuperAdminPayload;
  body: IDiscussionBoardAuditLog.IRequest;
}): Promise<IPageIDiscussionBoardAuditLog.ISummary> {
  // Extract pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE conditions with proper date handling
  const whereInput: Prisma.discussion_board_audit_logsWhereInput = {
    ...(props.body.action_type && { action_type: props.body.action_type }),
    ...(props.body.actor_type && { actor_type: props.body.actor_type }),
    ...(props.body.target_user_id && {
      target_user_id: props.body.target_user_id,
    }),
    ...(props.body.target_admin_id && {
      target_admin_id: props.body.target_admin_id,
    }),
    ...(props.body.target_super_admin_id && {
      target_super_admin_id: props.body.target_super_admin_id,
    }),
    ...(props.body.target_article_id && {
      target_article_id: props.body.target_article_id,
    }),
    ...(props.body.target_comment_id && {
      target_comment_id: props.body.target_comment_id,
    }),
    ...(props.body.target_section_id && {
      target_section_id: props.body.target_section_id,
    }),
    ...(props.body.success !== undefined && { success: props.body.success }),
    ...(props.body.created_at_start && {
      created_at: { gte: new Date(props.body.created_at_start) },
    }),
    ...(props.body.created_at_end && {
      created_at: { lte: new Date(props.body.created_at_end) },
    }),
    ...(props.body.updated_at_start && {
      updated_at: { gte: new Date(props.body.updated_at_start) },
    }),
    ...(props.body.updated_at_end && {
      updated_at: { lte: new Date(props.body.updated_at_end) },
    }),
    ...(props.body.search_term && {
      description: {
        contains: props.body.search_term,
        mode: "insensitive" as const,
      },
    }),
  };
  // Execute queries sequentially
  const data = await MyGlobal.prisma.discussion_board_audit_logs.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
  });
  const total = await MyGlobal.prisma.discussion_board_audit_logs.count({
    where: whereInput,
  });
  // Transform data
  const transformedData = data.map(
    (log) =>
      ({
        id: log.id,
        action_type: log.action_type,
        action_subtype:
          log.action_subtype === null ? undefined : log.action_subtype,
        description: log.description,
        success: log.success,
        created_at: toISOStringSafe(log.created_at),
        actor_type: log.actor_type,
        target_user_id: log.target_user_id,
        target_admin_id: log.target_admin_id,
        target_super_admin_id: log.target_super_admin_id,
        target_article_id: log.target_article_id,
        target_comment_id: log.target_comment_id,
        target_section_id: log.target_section_id,
      }) satisfies IDiscussionBoardAuditLog.ISummary,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIDiscussionBoardAuditLog.ISummary;
}
