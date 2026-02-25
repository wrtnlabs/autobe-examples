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

export async function patchDiscussionBoardSuperAdminAuditLogs(props: {
  superAdmin: SuperAdminPayload;
  body: IDiscussionBoardAuditLog.IRequest;
}): Promise<IPageIDiscussionBoardAuditLog.ISummary> {
  // Parse pagination parameters with type-safe defaults
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.min(100, Math.max(1, props.body.limit ?? 25));
  const skip = (page - 1) * limit;
  // Build comprehensive filter conditions for where clause
  const whereFilter: Prisma.discussion_board_audit_logsWhereInput = {
    // Basic filters
    ...(props.body.action_type !== undefined && {
      action_type: props.body.action_type,
    }),
    ...(props.body.actor_type !== undefined && {
      actor_type: props.body.actor_type,
    }),
    ...(props.body.success !== undefined && { success: props.body.success }),
    // Target entity ID filters (handle null values properly)
    ...(props.body.target_user_id !== undefined &&
      props.body.target_user_id !== null && {
        target_user_id: props.body.target_user_id,
      }),
    ...(props.body.target_admin_id !== undefined &&
      props.body.target_admin_id !== null && {
        target_admin_id: props.body.target_admin_id,
      }),
    ...(props.body.target_super_admin_id !== undefined &&
      props.body.target_super_admin_id !== null && {
        target_super_admin_id: props.body.target_super_admin_id,
      }),
    ...(props.body.target_article_id !== undefined &&
      props.body.target_article_id !== null && {
        target_article_id: props.body.target_article_id,
      }),
    ...(props.body.target_comment_id !== undefined &&
      props.body.target_comment_id !== null && {
        target_comment_id: props.body.target_comment_id,
      }),
    ...(props.body.target_section_id !== undefined &&
      props.body.target_section_id !== null && {
        target_section_id: props.body.target_section_id,
      }),
    // Date range filtering for created_at using proper datetime handling
    ...((props.body.created_at_start !== undefined ||
      props.body.created_at_end !== undefined) && {
      created_at: {
        ...(props.body.created_at_start !== undefined && {
          gte: new Date(props.body.created_at_start),
        }),
        ...(props.body.created_at_end !== undefined && {
          lte: new Date(props.body.created_at_end),
        }),
      },
    }),
    // Date range filtering for updated_at using proper datetime handling
    ...((props.body.updated_at_start !== undefined ||
      props.body.updated_at_end !== undefined) && {
      updated_at: {
        ...(props.body.updated_at_start !== undefined && {
          gte: new Date(props.body.updated_at_start),
        }),
        ...(props.body.updated_at_end !== undefined && {
          lte: new Date(props.body.updated_at_end),
        }),
      },
    }),
    // Text search on description field with validation
    ...(props.body.search_term !== undefined &&
      props.body.search_term.trim().length > 0 && {
        description: {
          contains: props.body.search_term,
          mode: "insensitive" as const,
        },
      }),
  };
  // Execute paginated query
  const data = await MyGlobal.prisma.discussion_board_audit_logs.findMany({
    where: whereFilter,
    orderBy: { created_at: "desc" as const },
    skip,
    take: limit,
    select: {
      id: true,
      action_type: true,
      action_subtype: true,
      description: true,
      success: true,
      created_at: true,
      actor_type: true,
      target_user_id: true,
      target_admin_id: true,
      target_super_admin_id: true,
      target_article_id: true,
      target_comment_id: true,
      target_section_id: true,
    } satisfies Prisma.discussion_board_audit_logsSelect,
  });
  // Get total count for pagination metadata
  const total = await MyGlobal.prisma.discussion_board_audit_logs.count({
    where: whereFilter,
  });
  // Transform database records to DTO format with proper datetime handling
  const transformedData = data.map(
    (log): IDiscussionBoardAuditLog.ISummary => ({
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
    }),
  );
  // Create proper pagination structure based on loaded DTO types
  const pagination: IPage.IPagination = {
    current: page,
    limit: limit,
    records: total,
    pages: Math.ceil(total / limit),
  };
  // Return paginated response with proper type structure
  // Use typia.assert for type safety without asserting on Prisma types
  const result = {
    data: transformedData,
    pagination: pagination,
  };
  return typia.assert<IPageIDiscussionBoardAuditLog.ISummary>(result);
}
