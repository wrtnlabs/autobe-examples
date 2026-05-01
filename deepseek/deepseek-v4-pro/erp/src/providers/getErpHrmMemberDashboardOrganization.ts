import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmOrganizationDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationDashboard";
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

export async function getErpHrmMemberDashboardOrganization(props: {
  member: MemberPayload;
}): Promise<IErpHrmOrganizationDashboard> {
  // ---------------------------------------------------------------------------
  // Resolve organization context from the member's active session
  // ---------------------------------------------------------------------------
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { erp_hrm_organization_id: true },
    });
  const organizationId = session.erp_hrm_organization_id;
  if (organizationId === null) {
    throw new HttpException("No organization selected", 400);
  }
  // ---------------------------------------------------------------------------
  // Compute current week boundaries (Monday 00:00:00.000 – Sunday 23:59:59.999)
  // Using pure timestamp arithmetic — no Date variables.
  // ---------------------------------------------------------------------------
  const MS_PER_DAY = 86400000;
  const nowMs = Date.now();
  const daysSinceEpoch = Math.floor(nowMs / MS_PER_DAY);
  // Jan 1, 1970 was a Thursday. (daysSinceEpoch + 3) % 7 yields 0=Monday.
  const dayOfWeekMonday0 = (daysSinceEpoch + 3) % 7;
  const mondayDaysSinceEpoch = daysSinceEpoch - dayOfWeekMonday0;
  const mondayMs = mondayDaysSinceEpoch * MS_PER_DAY;
  const sundayMs = mondayMs + 6 * MS_PER_DAY + MS_PER_DAY - 1;
  const weekStart = new Date(mondayMs).toISOString();
  const weekEnd = new Date(sundayMs).toISOString();
  // ---------------------------------------------------------------------------
  // Metric 1 — Active employee count
  // ---------------------------------------------------------------------------
  const activeEmployeeCount = await MyGlobal.prisma.erp_hrm_employees.count({
    where: {
      erp_hrm_organization_id: organizationId,
      status: "active",
      deleted_at: null,
    },
  });
  // ---------------------------------------------------------------------------
  // Metric 2 — Total hours logged this week across the organization
  // ---------------------------------------------------------------------------
  const weekAggregate = await MyGlobal.prisma.erp_hrm_timelogs.aggregate({
    _sum: { duration_minutes: true },
    where: {
      date: { gte: weekStart, lte: weekEnd },
      deleted_at: null,
      employee: {
        erp_hrm_organization_id: organizationId,
        deleted_at: null,
      },
    },
  });
  const totalMinutesThisWeek = weekAggregate._sum.duration_minutes ?? 0;
  const totalHoursThisWeek =
    Math.round((totalMinutesThisWeek / 60) * 100) / 100;
  // ---------------------------------------------------------------------------
  // Metric 3 — Pending timesheets (submitted, awaiting approval)
  // ---------------------------------------------------------------------------
  const pendingTimesheetsCount = await MyGlobal.prisma.erp_hrm_timesheets.count(
    {
      where: {
        status: "submitted",
        deleted_at: null,
        employee: {
          erp_hrm_organization_id: organizationId,
          deleted_at: null,
        },
      },
    },
  );
  // ---------------------------------------------------------------------------
  // Metric 4 — Projects exceeding 80% of budgeted hours
  // ---------------------------------------------------------------------------
  const projectsWithBudget = await MyGlobal.prisma.erp_hrm_projects.findMany({
    where: {
      organization_id: organizationId,
      budget_hours: { not: null },
      deleted_at: null,
    },
    select: {
      id: true,
      name: true,
      budget_hours: true,
    },
  });
  const projectsOverBudget =
    projectsWithBudget.length === 0
      ? []
      : await (async () => {
          const projectIds = projectsWithBudget.map((p) => p.id);
          const timelogAggregations =
            await MyGlobal.prisma.erp_hrm_timelogs.groupBy({
              by: ["project_id"],
              where: {
                project_id: { in: projectIds },
                deleted_at: null,
              },
              _sum: { duration_minutes: true },
            });
          const minutesByProject = new Map(
            timelogAggregations.map((agg) => [
              agg.project_id,
              agg._sum.duration_minutes ?? 0,
            ]),
          );
          return projectsWithBudget
            .map((project) => {
              const budgetHours = project.budget_hours ?? 0;
              const totalMinutes = minutesByProject.get(project.id) ?? 0;
              const actualHours = Math.round((totalMinutes / 60) * 100) / 100;
              const utilization =
                budgetHours > 0 ? actualHours / budgetHours : 0;
              return {
                project_id: project.id,
                project_name: project.name,
                budget_hours: budgetHours,
                actual_hours: actualHours,
                utilization,
              };
            })
            .filter((entry) => entry.utilization > 0.8)
            .sort((a, b) => b.utilization - a.utilization)
            .map((entry) => ({
              project_id: entry.project_id,
              project_name: entry.project_name,
              budget_hours: entry.budget_hours,
              actual_hours: entry.actual_hours,
            }));
        })();
  // ---------------------------------------------------------------------------
  // Metric 5 — Top 5 employees by hours logged this week
  // ---------------------------------------------------------------------------
  const topEmployeeAggregations =
    await MyGlobal.prisma.erp_hrm_timelogs.groupBy({
      by: ["employee_id"],
      where: {
        date: { gte: weekStart, lte: weekEnd },
        deleted_at: null,
        employee: {
          erp_hrm_organization_id: organizationId,
          deleted_at: null,
          status: "active",
        },
      },
      _sum: { duration_minutes: true },
      orderBy: { _sum: { duration_minutes: "desc" } },
      take: 5,
    });
  const topEmployees =
    topEmployeeAggregations.length === 0
      ? []
      : await (async () => {
          const employeeIds = topEmployeeAggregations.map((e) => e.employee_id);
          const employeeRecords =
            await MyGlobal.prisma.erp_hrm_employees.findMany({
              where: { id: { in: employeeIds } },
              select: {
                id: true,
                member: { select: { display_name: true } },
              },
            });
          const displayNameByEmployeeId = new Map(
            employeeRecords.map((emp) => [emp.id, emp.member.display_name]),
          );
          return topEmployeeAggregations.map((agg) => {
            const totalMinutes = agg._sum.duration_minutes ?? 0;
            return {
              employee_id: agg.employee_id,
              display_name: displayNameByEmployeeId.get(agg.employee_id) ?? "",
              total_hours: Math.round((totalMinutes / 60) * 100) / 100,
            };
          });
        })();
  // ---------------------------------------------------------------------------
  // Assemble and validate response
  // ---------------------------------------------------------------------------
  return typia.assert<IErpHrmOrganizationDashboard>({
    active_employee_count: activeEmployeeCount,
    total_hours_this_week: totalHoursThisWeek,
    pending_timesheets_count: pendingTimesheetsCount,
    projects_over_budget: projectsOverBudget,
    top_employees: topEmployees,
  });
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IErpHrmOrganizationDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationDashboard";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getErpHrmMemberDashboardOrganization(props: {
//   member: MemberPayload;
// }): Promise<IErpHrmOrganizationDashboard> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------