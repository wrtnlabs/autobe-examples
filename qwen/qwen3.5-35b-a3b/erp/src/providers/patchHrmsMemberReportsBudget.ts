import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimesheet";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmsTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmsMemberReportsBudget(props: {
  member: MemberPayload;
  body: IHrmsTimesheet.IRequest;
}): Promise<IPageIHrmsTimesheet.ISummary> {
  // Validate required date range parameters
  if (props.body.start_date === undefined || props.body.start_date === null) {
    throw new HttpException("start_date is required", 400);
  }
  if (props.body.end_date === undefined || props.body.end_date === null) {
    throw new HttpException("end_date is required", 400);
  }
  if (props.body.start_date > props.body.end_date) {
    throw new HttpException("end_date must be >= start_date", 400);
  }
  // Verify organization context
  const organizationId = props.body.organization_id;
  if (!organizationId) {
    throw new HttpException("organization_id is required", 400);
  }
  // Check organization membership and report:view permission
  const member = await MyGlobal.prisma.hrms_organization_members.findFirst({
    where: {
      hrms_member_id: props.member.id,
      hrms_organization_id: organizationId,
      deleted_at: null,
    },
    include: {
      organizationRole: {
        include: {
          permissions: true,
        },
      },
    },
  });
  if (!member) {
    throw new HttpException("Organization access denied", 403);
  }
  const hasReportViewPermission = member.organizationRole.permissions.some(
    (p) => p.permission === "report:view",
  );
  if (!hasReportViewPermission) {
    throw new HttpException("report:view permission required", 403);
  }
  // Pagination parameters
  const page = props.body.page ?? 1;
  const pageSize = props.body.page_size ?? 20;
  const sortOrder = props.body.sort_order ?? "desc";
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * pageSize;
  // Total count for pagination metadata
  const totalProjects = await MyGlobal.prisma.hrms_projects.count({
    where: {
      hrms_organization_id: organizationId,
      budget_hours: { not: null },
      deleted_at: null,
    },
  });
  // Complex aggregation query: projects with summed timelog hours
  const projects = await MyGlobal.prisma.$queryRaw<
    Array<{
      project_id: string & tags.Format<"uuid">;
      project_name: string;
      budget_hours: number;
      actual_hours: number;
      utilization_percentage: number;
      utilization_flag: boolean;
    }>
  >`
    SELECT
      p.id::text AS project_id,
      p.name AS project_name,
      p.budget_hours::numeric AS budget_hours,
      COALESCE(SUM(T.duration_minutes)::numeric / 60, 0) AS actual_hours,
      CASE
        WHEN p.budget_hours IS NOT NULL AND p.budget_hours > 0
        THEN ROUND((COALESCE(SUM(T.duration_minutes)::numeric / 60, 0) / p.budget_hours) * 100, 1)
        ELSE 0
      END AS utilization_percentage,
      CASE
        WHEN p.budget_hours IS NOT NULL AND p.budget_hours > 0
        AND (COALESCE(SUM(T.duration_minutes)::numeric / 60, 0) / p.budget_hours) * 100 > 80
        THEN true
        ELSE false
      END AS utilization_flag
    FROM hrms_projects p
    LEFT JOIN hrms_timelogs T ON T.hrms_project_id = p.id
      AND T.deleted_at IS NULL
      AND TO_CHAR(T.date_at, 'YYYY-MM-DD') >= ${props.body.start_date}
      AND TO_CHAR(T.date_at, 'YYYY-MM-DD') <= ${props.body.end_date}
    WHERE p.hrms_organization_id = ${organizationId}
      AND p.budget_hours IS NOT NULL
      AND p.budget_hours > 0
      AND p.deleted_at IS NULL
    GROUP BY p.id, p.name, p.budget_hours
    ORDER BY utilization_percentage ${sortOrder.toUpperCase()}
    LIMIT ${pageSize}
    OFFSET ${skip}
  `;
  return {
    data: projects.map((p) => ({
      project_id: p.project_id,
      project_name: p.project_name,
      budget_hours: p.budget_hours,
      actual_hours: p.actual_hours,
      utilization_percentage: p.utilization_percentage,
      utilization_flag: p.utilization_flag,
    })) satisfies IHrmsTimesheet.ISummary[],
    pagination: {
      current: page,
      limit: pageSize,
      records: totalProjects,
      pages: Math.ceil(totalProjects / pageSize),
    } satisfies IPage.IPagination,
  } satisfies IPageIHrmsTimesheet.ISummary;
}
