import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmWeeklySummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmWeeklySummary";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmWeeklySummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmWeeklySummary";
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

export async function patchErpHrmMemberReportsWeeklySummary(props: {
  member: MemberPayload;
  body: IErpHrmWeeklySummary.IRequest;
}): Promise<IPageIErpHrmWeeklySummary.ISummary> {
  // Get session with organization context
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: {
        erp_hrm_organization_id: true,
      },
    });
  if (session.erp_hrm_organization_id === null) {
    throw new HttpException("No organization context selected", 400);
  }
  const organizationId = session.erp_hrm_organization_id;
  // Get employee record to check role and permissions
  const employee = await MyGlobal.prisma.erp_hrm_employees.findUniqueOrThrow({
    where: {
      erp_hrm_member_id_erp_hrm_organization_id: {
        erp_hrm_member_id: props.member.id,
        erp_hrm_organization_id: organizationId,
      },
    },
    select: {
      erp_hrm_role_id: true,
    },
  });
  // Check for report:view permission
  const permission = await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
    where: {
      erp_hrm_role_id: employee.erp_hrm_role_id,
      permission: "report:view",
    },
    select: { id: true },
  });
  if (permission === null) {
    throw new HttpException("Forbidden - report:view permission required", 403);
  }
  // Validate project filter if provided
  if (props.body.project_id !== undefined && props.body.project_id !== null) {
    const project = await MyGlobal.prisma.erp_hrm_projects.findFirst({
      where: {
        id: props.body.project_id,
        organization_id: organizationId,
        deleted_at: null,
      } satisfies Prisma.erp_hrm_projectsWhereInput,
      select: { id: true },
    });
    if (project === null) {
      throw new HttpException("Project not found", 404);
    }
  }
  // Calculate date range (default: last 8 weeks)
  const now = new Date();
  const defaultFrom = new Date(now);
  defaultFrom.setDate(now.getDate() - 56); // 8 weeks back
  const fromDate =
    props.body.from !== undefined ? new Date(props.body.from) : defaultFrom;
  const toDate = props.body.to !== undefined ? new Date(props.body.to) : now;
  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  // Build where conditions for counting
  const baseWhere = {
    employee: {
      erp_hrm_organization_id: organizationId,
    },
    deleted_at: null,
    date: {
      gte: fromDate,
      lte: toDate,
    },
    ...(props.body.project_id !== undefined &&
      props.body.project_id !== null && { project_id: props.body.project_id }),
  } satisfies Prisma.erp_hrm_timelogsWhereInput;
  // Get all timelogs for the date range (we need to group by week in code)
  // Using Prisma groupBy would be ideal but week calculation needs custom logic
  const timelogs = await MyGlobal.prisma.erp_hrm_timelogs.findMany({
    where: baseWhere,
    select: {
      employee_id: true,
      duration: true,
      date: true,
    },
  });
  // Group by week (Monday to Sunday)
  const weekMap = new Map<
    string,
    {
      totalDuration: number;
      timelogCount: number;
      employeeIds: Set<string>;
    }
  >();
  for (const timelog of timelogs) {
    const logDate = new Date(timelog.date);
    const dayOfWeek = logDate.getDay();
    // Convert Sunday (0) to 7 for easier calculation
    const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek;
    // Days since Monday (0 for Monday, 6 for Sunday)
    const daysSinceMonday = adjustedDay - 1;
    const monday = new Date(logDate);
    monday.setDate(logDate.getDate() - daysSinceMonday);
    monday.setHours(0, 0, 0, 0);
    const weekKey = monday.toISOString().split("T")[0] as string &
      tags.Format<"date">;
    const existing = weekMap.get(weekKey);
    if (existing !== undefined) {
      existing.totalDuration += timelog.duration;
      existing.timelogCount += 1;
      existing.employeeIds.add(timelog.employee_id);
    } else {
      weekMap.set(weekKey, {
        totalDuration: timelog.duration,
        timelogCount: 1,
        employeeIds: new Set([timelog.employee_id]),
      });
    }
  }
  // Convert to array and sort by week start date descending
  const allWeeks = Array.from(weekMap.entries())
    .map(([weekStart, data]) => {
      const startDate = new Date(weekStart);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
      const weekEnd = endDate.toISOString().split("T")[0];
      return {
        week_start_date: weekStart as string & tags.Format<"date">,
        week_end_date: weekEnd as string & tags.Format<"date">,
        total_hours: data.totalDuration / 60.0,
        timelog_count: data.timelogCount,
        employee_count: data.employeeIds.size,
      } satisfies IErpHrmWeeklySummary.ISummary;
    })
    .sort((a, b) => b.week_start_date.localeCompare(a.week_start_date));
  // Apply pagination
  const totalRecords = allWeeks.length;
  const totalPages = Math.ceil(totalRecords / limit);
  const offset = (page - 1) * limit;
  const paginatedWeeks = allWeeks.slice(offset, offset + limit);
  return {
    data: paginatedWeeks,
    pagination: {
      current: page,
      limit: limit,
      records: totalRecords,
      pages: totalPages,
    } satisfies IPage.IPagination,
  } satisfies IPageIErpHrmWeeklySummary.ISummary;
}
