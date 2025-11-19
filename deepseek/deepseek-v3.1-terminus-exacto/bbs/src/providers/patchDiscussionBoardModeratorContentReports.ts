import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentReport";
import { IPageIDiscussionBoardContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentReport";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchDiscussionBoardModeratorContentReports(props: {
  moderator: ModeratorPayload;
  body: IDiscussionBoardContentReport.IRequest;
}): Promise<IPageIDiscussionBoardContentReport.ISummary> {
  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;

  // Build where conditions using proper Prisma types
  const whereConditions: Prisma.discussion_board_content_reportsWhereInput = {
    deleted_at: null,
  };

  // Status filter
  if (props.body.status !== undefined && props.body.status !== null) {
    whereConditions.status = props.body.status;
  }

  // Priority filter
  if (props.body.priority !== undefined && props.body.priority !== null) {
    whereConditions.priority = props.body.priority;
  }

  // Actor type filter
  if (props.body.actor_type !== undefined && props.body.actor_type !== null) {
    whereConditions.actor_type = props.body.actor_type;
  }

  // Report reason filter
  if (
    props.body.report_reason !== undefined &&
    props.body.report_reason !== null
  ) {
    whereConditions.report_reason = props.body.report_reason;
  }

  // Date range filter - convert string dates to ISO strings for comparison
  if (props.body.created_at_start || props.body.created_at_end) {
    whereConditions.created_at = {};
    if (props.body.created_at_start) {
      whereConditions.created_at.gte = props.body.created_at_start;
    }
    if (props.body.created_at_end) {
      whereConditions.created_at.lte = props.body.created_at_end;
    }
  }

  // Text search in report_details
  if (
    props.body.search !== undefined &&
    props.body.search !== null &&
    props.body.search.trim() !== ""
  ) {
    whereConditions.report_details = {
      contains: props.body.search,
      mode: "insensitive" as const,
    };
  }

  // Execute concurrent queries for pagination
  const [reports, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_content_reports.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.discussion_board_content_reports.count({
      where: whereConditions,
    }),
  ]);

  // Transform reports to summary DTOs
  const data = await Promise.all(
    reports.map(async (report) => {
      // For this implementation, we'll return basic actor and content info
      // since the actual resolution requires additional schema information
      const actor: IDiscussionBoardMember.ISummary = {
        id: v4() as string & tags.Format<"uuid">, // Placeholder - would need actual actor resolution
        type: report.actor_type,
        name: `Actor (${report.actor_type})`,
      };

      const content: IDiscussionBoardPost.ISummary = {
        id: report.id as string & tags.Format<"uuid">, // Use report.id since content_id doesn't exist
        type: "post", // Default type since content_type doesn't exist
        title: `Content Report: ${report.report_reason}`,
      };

      return {
        id: report.id,
        actor,
        content,
        report_reason: report.report_reason,
        status: report.status,
        priority: report.priority,
        report_details: report.report_details ?? undefined,
        created_at: toISOStringSafe(report.created_at),
        updated_at: toISOStringSafe(report.updated_at),
      };
    }),
  );

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
