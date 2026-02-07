import { IDiscussionBoardErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardErrorLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardErrorLog";
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

export async function patchDiscussionBoardSuperAdminErrorLogs(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardErrorLog.IRequest;
}): Promise<IPageIDiscussionBoardErrorLog.ISummary> {
  try {
    const page = 1;
    const limit = 100;
    const skip = (page - 1) * limit;
    // Build WHERE conditions with Prisma's parameterized approach
    const whereConditions: Prisma.Sql[] = [Prisma.sql`deleted_at IS NULL`];
    if (props.body.start_date) {
      whereConditions.push(Prisma.sql`occurred_at >= ${props.body.start_date}`);
    }
    if (props.body.end_date) {
      whereConditions.push(Prisma.sql`occurred_at <= ${props.body.end_date}`);
    }
    if (props.body.error_types?.length) {
      whereConditions.push(
        Prisma.sql`error_type = ANY(${props.body.error_types})`,
      );
    }
    if (props.body.severities?.length) {
      whereConditions.push(
        Prisma.sql`severity = ANY(${props.body.severities})`,
      );
    }
    if (props.body.components?.length) {
      whereConditions.push(
        Prisma.sql`component = ANY(${props.body.components})`,
      );
    }
    if (props.body.environments?.length) {
      whereConditions.push(
        Prisma.sql`environment = ANY(${props.body.environments})`,
      );
    }
    const whereClause =
      whereConditions.length > 1
        ? Prisma.sql`WHERE ${Prisma.join(whereConditions, " AND ")}`
        : Prisma.empty;
    // Get aggregated data with pagination
    const dataQuery = Prisma.sql`
      SELECT 
        error_type,
        severity,
        component,
        environment,
        COUNT(*) as error_count,
        MIN(occurred_at) as first_occurred_at,
        MAX(occurred_at) as last_occurred_at
      FROM discussion_board_error_logs
      ${whereClause}
      GROUP BY error_type, severity, component, environment
      ORDER BY MAX(occurred_at) DESC
      LIMIT ${limit} OFFSET ${skip}
    `;
    const data = await MyGlobal.prisma.$queryRaw<
      Array<{
        error_type: string;
        severity: string;
        component: string | null;
        environment: string;
        error_count: bigint;
        first_occurred_at: string;
        last_occurred_at: string;
      }>
    >(dataQuery);
    // Get total count for pagination
    const countQuery = Prisma.sql`
      SELECT COUNT(*) as total_count
      FROM (
        SELECT 1
        FROM discussion_board_error_logs
        ${whereClause}
        GROUP BY error_type, severity, component, environment
      ) as grouped_data
    `;
    const countResult = await MyGlobal.prisma.$queryRaw<
      Array<{
        total_count: bigint;
      }>
    >(countQuery);
    const total = Number(countResult[0]?.total_count || 0n);
    // Transform raw results to DTO
    const transformedData = data.map((item) => ({
      error_type: item.error_type,
      severity: item.severity,
      component: item.component ?? undefined,
      environment: item.environment,
      error_count: Number(item.error_count),
      first_occurred_at: toISOStringSafe(item.first_occurred_at),
      last_occurred_at: toISOStringSafe(item.last_occurred_at),
    }));
    return {
      data: transformedData,
      pagination: {
        current: page,
        limit: limit,
        records: total,
        pages: Math.ceil(total / limit),
      } satisfies IPage.IPagination,
    };
  } catch (error) {
    throw new HttpException("Failed to retrieve error logs", 500);
  }
}
