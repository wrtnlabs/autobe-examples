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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardAuditLogAtSummaryTransformer } from "../transformers/DiscussionBoardAuditLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminLogs(props: {
  admin: AdminPayload;
  body: IDiscussionBoardAuditLog.IRequest;
}): Promise<IPageIDiscussionBoardAuditLog.ISummary> {
  // Validate and set pagination parameters
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.min(Math.max(1, props.body.limit ?? 100), 100);
  const skip = (page - 1) * limit;
  // Build filter conditions without using Date constructor
  const whereInput = {
    ...(props.body.action_type !== undefined && {
      action_type: props.body.action_type,
    }),
    ...(props.body.actor_type !== undefined && {
      actor_type: props.body.actor_type,
    }),
    ...(props.body.target_user_id !== undefined && {
      target_user_id: props.body.target_user_id,
    }),
    ...(props.body.target_admin_id !== undefined && {
      target_admin_id: props.body.target_admin_id,
    }),
    ...(props.body.target_super_admin_id !== undefined && {
      target_super_admin_id: props.body.target_super_admin_id,
    }),
    ...(props.body.target_article_id !== undefined && {
      target_article_id: props.body.target_article_id,
    }),
    ...(props.body.target_comment_id !== undefined && {
      target_comment_id: props.body.target_comment_id,
    }),
    ...(props.body.target_section_id !== undefined && {
      target_section_id: props.body.target_section_id,
    }),
    ...(props.body.success !== undefined && { success: props.body.success }),
    ...(props.body.created_at_start !== undefined && {
      created_at: {
        gte: props.body.created_at_start,
      },
    }),
    ...(props.body.created_at_end !== undefined && {
      created_at: {
        lte: props.body.created_at_end,
      },
    }),
    ...(props.body.updated_at_start !== undefined && {
      updated_at: {
        gte: props.body.updated_at_start,
      },
    }),
    ...(props.body.updated_at_end !== undefined && {
      updated_at: {
        lte: props.body.updated_at_end,
      },
    }),
    ...(props.body.search_term !== undefined && {
      description: {
        contains: props.body.search_term,
        mode: "insensitive" as const,
      },
    }),
  } satisfies Prisma.discussion_board_audit_logsWhereInput;
  // Use sequential awaits instead of Promise.all for better error handling
  const data = await MyGlobal.prisma.discussion_board_audit_logs.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" as const },
    ...DiscussionBoardAuditLogAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.discussion_board_audit_logs.count({
    where: whereInput,
  });
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardAuditLogAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      pagination: {
        current: page,
        limit: limit,
        records: total,
        pages: Math.ceil(total / limit),
      } satisfies IPage.IPagination,
    },
  } satisfies IPageIDiscussionBoardAuditLog.ISummary;
}
