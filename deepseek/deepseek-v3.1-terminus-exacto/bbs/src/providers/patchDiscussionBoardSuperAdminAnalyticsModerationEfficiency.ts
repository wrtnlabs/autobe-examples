import { IDiscussionBoardPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPerformanceMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardPerformanceMetric";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminAnalyticsModerationEfficiency(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardPerformanceMetric.IRequest;
}): Promise<IPageIDiscussionBoardPerformanceMetric.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  // Build filtering conditions based on request parameters
  const whereConditions: any = {
    AND: [],
  };
  // Apply date range filters if provided
  if (props.body.registration_date_start) {
    whereConditions.AND.push({
      created_at: { gte: props.body.registration_date_start },
    });
  }
  if (props.body.registration_date_end) {
    whereConditions.AND.push({
      created_at: { lte: props.body.registration_date_end },
    });
  }
  if (props.body.last_activity_start) {
    whereConditions.AND.push({
      updated_at: { gte: props.body.last_activity_start },
    });
  }
  if (props.body.last_activity_end) {
    whereConditions.AND.push({
      updated_at: { lte: props.body.last_activity_end },
    });
  }
  try {
    // Complex query to calculate moderation efficiency metrics
    const efficiencyMetrics = await MyGlobal.prisma.$queryRaw<
      Array<{
        period_start: string;
        period_end: string;
        total_moderations: number;
        avg_resolution_hours: number;
        escalation_rate: number;
        backlog_size: number;
        throughput_per_admin: number;
      }>
    >`
      WITH period_stats AS (
        SELECT 
          DATE_TRUNC('day', ml.performed_at) as period_start,
          DATE_TRUNC('day', ml.performed_at) + INTERVAL '1 day' as period_end,
          COUNT(DISTINCT ml.id) as total_moderations,
          AVG(EXTRACT(EPOCH FROM (cmq.resolved_at - cmq.created_at)) / 3600) as avg_resolution_hours,
          COUNT(CASE WHEN cmq.escalated_by_admin_id IS NOT NULL THEN 1 END) * 100.0 / 
            NULLIF(COUNT(DISTINCT cmq.id), 0) as escalation_rate,
          COUNT(CASE WHEN cmq.moderation_status IN ('pending', 'under_review') THEN 1 END) as backlog_size,
          COUNT(DISTINCT cmq.id) * 1.0 / NULLIF(COUNT(DISTINCT cmq.assigned_admin_id), 1) as throughput_per_admin
        FROM discussion_board_moderation_logs ml
        LEFT JOIN discussion_board_content_moderation_queues cmq ON ml.target_article_id = cmq.content_flag_id 
          OR ml.target_comment_id = cmq.content_flag_id
        LEFT JOIN discussion_board_moderated_content_histories mch ON ml.id = mch.moderator_admin_id
        WHERE ml.deleted_at IS NULL 
          AND ml.performed_at >= COALESCE(${props.body.registration_date_start}, '1970-01-01')
          AND ml.performed_at <= COALESCE(${props.body.registration_date_end}, NOW())
        GROUP BY DATE_TRUNC('day', ml.performed_at)
        ORDER BY period_start DESC
        LIMIT ${limit}
        OFFSET ${skip}
      )
      SELECT * FROM period_stats
    `;
    // Calculate total count for pagination
    const totalRecordsQuery = await MyGlobal.prisma.$queryRaw<
      Array<{
        total: bigint;
      }>
    >`
      SELECT COUNT(DISTINCT DATE_TRUNC('day', performed_at)) as total
      FROM discussion_board_moderation_logs
      WHERE deleted_at IS NULL
        AND performed_at >= COALESCE(${props.body.registration_date_start}, '1970-01-01')
        AND performed_at <= COALESCE(${props.body.registration_date_end}, NOW())
    `;
    const totalRecords = Number(totalRecordsQuery[0]?.total ?? 0);
    // Transform to match the expected response format
    const data: IDiscussionBoardPerformanceMetric.ISummary[] =
      efficiencyMetrics.map((metric) => ({
        // Map the calculated metrics to the appropriate DTO fields
        // Note: The actual DTO structure appears empty but should contain the calculated metrics
        period_start: metric.period_start,
        period_end: metric.period_end,
        total_moderations: metric.total_moderations,
        avg_resolution_hours: metric.avg_resolution_hours,
        escalation_rate: metric.escalation_rate,
        backlog_size: metric.backlog_size,
        throughput_per_admin: metric.throughput_per_admin,
      }));
    return {
      pagination: {
        current: page,
        limit: limit,
        records: totalRecords,
        pages: Math.ceil(totalRecords / limit),
      } satisfies IPage.IPagination,
      data: data,
    };
  } catch (error) {
    console.error("Failed to retrieve moderation efficiency analytics:", error);
    throw new HttpException(
      "Failed to retrieve moderation efficiency analytics",
      500,
    );
  }
}
