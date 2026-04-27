import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingOrganizationDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganizationDashboard";
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

function getWeekBoundaries(timezone: string): {
  weekStart: Date;
  weekEnd: Date;
} {
  const now = new Date();
  const dateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const [y, m, d] = dateStr.split("-").map(Number);
  // Use UTC noon to avoid timezone boundary issues
  const utcDate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0));
  const dayOfWeek = utcDate.getUTCDay(); // 0=Sunday, 1=Monday, ...
  // Compute Monday offset: if Sunday (0), go back 6 days; otherwise go back (dayOfWeek - 1) days
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(Date.UTC(y, m - 1, d + mondayOffset, 0, 0, 0, 0));
  const weekEnd = new Date(
    Date.UTC(y, m - 1, d + mondayOffset + 6, 23, 59, 59, 999),
  );
  return { weekStart, weekEnd };
}
export async function getHrmTimeTrackingMemberOrganizationsOrganizationIdDashboard(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
}): Promise<IHrmTimeTrackingOrganizationDashboard> {
  // ----
  // 1. VERIFY ORGANIZATION EXISTS
  // ----
  const organization =
    await MyGlobal.prisma.hrm_time_tracking_organizations.findUniqueOrThrow({
      where: { id: props.organizationId },
      select: {
        id: true,
        timezone: true,
      },
    });
  // ----
  // 2. GET MEMBER'S EMPLOYEE RECORD FOR THIS ORGANIZATION
  // ----
  const employee = await MyGlobal.prisma.hrm_time_tracking_employees.findFirst({
    where: {
      hrm_time_tracking_member_id: props.member.id,
      hrm_time_tracking_organization_id: props.organizationId,
      deleted_at: null,
    },
    select: {
      id: true,
      hrm_time_tracking_role_id: true,
    },
  });
  if (employee === null) {
    throw new HttpException("Forbidden", 403);
  }
  // ----
  // 3. CHECK report:view PERMISSION
  // ----
  const permission =
    await MyGlobal.prisma.hrm_time_tracking_role_permissions.findFirst({
      where: {
        hrm_time_tracking_role_id: employee.hrm_time_tracking_role_id,
        permission_code: "report:view",
        deleted_at: null,
      },
      select: { id: true },
    });
  if (permission === null) {
    throw new HttpException("Forbidden", 403);
  }
  // ----
  // 4. COMPUTE WEEK BOUNDARIES
  // ----
  const { weekStart, weekEnd } = getWeekBoundaries(organization.timezone);
  // ----
  // 5. COMPUTE DASHBOARD METRICS
  // ----
  // 5a. Active employee count
  const activeEmployeeCount =
    await MyGlobal.prisma.hrm_time_tracking_employees.count({
      where: {
        hrm_time_tracking_organization_id: props.organizationId,
        status: "active",
        deleted_at: null,
      },
    });
  // 5b. Total hours logged this week
  const weeklyHoursAgg =
    await MyGlobal.prisma.hrm_time_tracking_timelogs.aggregate({
      _sum: { duration_minutes: true },
      where: {
        employee: {
          hrm_time_tracking_organization_id: props.organizationId,
        },
        date: { gte: weekStart, lte: weekEnd },
        deleted_at: null,
      },
    });
  const weeklyHours = (weeklyHoursAgg._sum.duration_minutes ?? 0) / 60.0;
  // 5c. Pending timesheets count
  const pendingTimesheetCount =
    await MyGlobal.prisma.hrm_time_tracking_timesheets.count({
      where: {
        employee: {
          hrm_time_tracking_organization_id: props.organizationId,
        },
        status: "submitted",
        deleted_at: null,
      },
    });
  // 5d. Budget alerts — projects exceeding 80% budget utilization
  const budgetProjects =
    await MyGlobal.prisma.hrm_time_tracking_projects.findMany({
      where: {
        hrm_time_tracking_organization_id: props.organizationId,
        status: "active",
        deleted_at: null,
        budget_hours: { not: null },
      },
      select: {
        id: true,
        name: true,
        budget_hours: true,
      },
    });
  const projectIds = budgetProjects.map((p) => p.id);
  const timelogGroupByProject =
    projectIds.length > 0
      ? await MyGlobal.prisma.hrm_time_tracking_timelogs.groupBy({
          by: ["hrm_time_tracking_project_id"],
          _sum: { duration_minutes: true },
          where: {
            hrm_time_tracking_project_id: { in: projectIds },
            deleted_at: null,
          },
        })
      : [];
  const projectHoursMap = new Map<string, number>();
  for (const agg of timelogGroupByProject) {
    const hours = (agg._sum.duration_minutes ?? 0) / 60.0;
    projectHoursMap.set(agg.hrm_time_tracking_project_id, hours);
  }
  const budgetAlerts: IHrmTimeTrackingOrganizationDashboard.IBudgetAlert[] = [];
  for (const project of budgetProjects) {
    const totalLoggedHours = projectHoursMap.get(project.id) ?? 0;
    if (project.budget_hours !== null && project.budget_hours > 0) {
      const utilizationPercent =
        (totalLoggedHours / project.budget_hours) * 100;
      if (utilizationPercent > 80) {
        budgetAlerts.push({
          projectId: project.id,
          projectName: project.name,
          budgetHours: project.budget_hours,
          totalLoggedHours: Math.round(totalLoggedHours * 100) / 100,
          utilizationPercent: Math.round(utilizationPercent * 100) / 100,
        } satisfies IHrmTimeTrackingOrganizationDashboard.IBudgetAlert);
      }
    }
  }
  // 5e. Top 5 employees by hours logged this week
  const topTimelogGroups =
    await MyGlobal.prisma.hrm_time_tracking_timelogs.groupBy({
      by: ["hrm_time_tracking_employee_id"],
      _sum: { duration_minutes: true },
      where: {
        employee: {
          hrm_time_tracking_organization_id: props.organizationId,
        },
        date: { gte: weekStart, lte: weekEnd },
        deleted_at: null,
      },
      orderBy: { _sum: { duration_minutes: "desc" } },
      take: 5,
    });
  const topEmployeeIds = topTimelogGroups.map(
    (g) => g.hrm_time_tracking_employee_id,
  );
  let employeeNamesMap = new Map<string, string>();
  if (topEmployeeIds.length > 0) {
    const employeeRecords =
      await MyGlobal.prisma.hrm_time_tracking_employees.findMany({
        where: { id: { in: topEmployeeIds } },
        select: {
          id: true,
          member: {
            select: { display_name: true },
          } satisfies Prisma.hrm_time_tracking_membersFindManyArgs,
        },
      });
    for (const e of employeeRecords) {
      employeeNamesMap.set(e.id, e.member.display_name);
    }
  }
  const topEmployees: IHrmTimeTrackingOrganizationDashboard.ITopEmployee[] =
    topTimelogGroups.map((g) => {
      const totalMinutes = g._sum.duration_minutes ?? 0;
      const totalHours = Math.round((totalMinutes / 60.0) * 100) / 100;
      return {
        employeeId: typia.assert<string & tags.Format<"uuid">>(
          g.hrm_time_tracking_employee_id,
        ),
        employeeName:
          employeeNamesMap.get(g.hrm_time_tracking_employee_id) ?? "",
        totalHours,
      } satisfies IHrmTimeTrackingOrganizationDashboard.ITopEmployee;
    });
  // ----
  // 6. ASSEMBLE AND RETURN DASHBOARD
  // ----
  return {
    activeEmployeeCount,
    weeklyHours: Math.round(weeklyHours * 100) / 100,
    pendingTimesheetCount,
    budgetAlerts,
    topEmployees,
  } satisfies IHrmTimeTrackingOrganizationDashboard;
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
// import { IHrmTimeTrackingOrganizationDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganizationDashboard";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getHrmTimeTrackingMemberOrganizationsOrganizationIdDashboard(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
// }): Promise<IHrmTimeTrackingOrganizationDashboard> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------