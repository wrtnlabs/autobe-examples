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

export async function getHrmTimeTrackingMemberDashboardOrganization(props: {
  member: MemberPayload;
}): Promise<IHrmTimeTrackingOrganizationDashboard> {
  // Find the member's employee record to determine organization context
  const employee = await MyGlobal.prisma.hrm_time_tracking_employees.findFirst({
    where: {
      hrm_time_tracking_member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      hrm_time_tracking_organization_id: true,
      organization: {
        select: { timezone: true },
      },
    },
  });
  if (!employee) {
    throw new HttpException("Employee record not found", 404);
  }
  const organizationId = employee.hrm_time_tracking_organization_id;
  // ----------------------------------------------------------
  // 1. Active employee count
  // ----------------------------------------------------------
  const activeEmployeeCount =
    await MyGlobal.prisma.hrm_time_tracking_employees.count({
      where: {
        hrm_time_tracking_organization_id: organizationId,
        status: "active",
        deleted_at: null,
      },
    });
  // ----------------------------------------------------------
  // 2. Total hours this week (Monday-Sunday)
  // ----------------------------------------------------------
  // Calculate current Monday-Sunday week boundaries
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + mondayOffset,
  );
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  const weeklyTimelogAgg =
    await MyGlobal.prisma.hrm_time_tracking_timelogs.aggregate({
      where: {
        employee: {
          hrm_time_tracking_organization_id: organizationId,
          deleted_at: null,
        },
        date: { gte: monday, lte: sunday },
        deleted_at: null,
      },
      _sum: { duration_minutes: true },
    });
  const weeklyHours = ((weeklyTimelogAgg._sum.duration_minutes ?? 0) /
    60.0) satisfies number as number;
  // ----------------------------------------------------------
  // 3. Pending timesheets count
  // ----------------------------------------------------------
  const pendingTimesheetCount =
    await MyGlobal.prisma.hrm_time_tracking_timesheets.count({
      where: {
        employee: {
          hrm_time_tracking_organization_id: organizationId,
          deleted_at: null,
        },
        status: "submitted",
        deleted_at: null,
      },
    });
  // ----------------------------------------------------------
  // 4. Budget alerts (>80% utilization)
  // ----------------------------------------------------------
  const projects = await MyGlobal.prisma.hrm_time_tracking_projects.findMany({
    where: {
      hrm_time_tracking_organization_id: organizationId,
      status: "active",
      budget_hours: { not: null },
      deleted_at: null,
    },
    select: {
      id: true,
      name: true,
      budget_hours: true,
    },
  });
  const projectIds: string[] = projects.map((p) => p.id);
  // Get total logged hours per project using findMany + JS aggregation
  // (avoiding Prisma groupBy which has complex type intersection issues)
  const projectTimelogs =
    projectIds.length > 0
      ? await MyGlobal.prisma.hrm_time_tracking_timelogs.findMany({
          where: {
            hrm_time_tracking_project_id: { in: projectIds },
            deleted_at: null,
          },
          select: {
            hrm_time_tracking_project_id: true,
            duration_minutes: true,
          },
        })
      : [];
  const timelogSumMap = new Map<string, number>();
  for (const tl of projectTimelogs) {
    const projectId = tl.hrm_time_tracking_project_id;
    const currentTotal = timelogSumMap.get(projectId) ?? 0;
    timelogSumMap.set(projectId, currentTotal + tl.duration_minutes / 60.0);
  }
  const budgetAlerts: IHrmTimeTrackingOrganizationDashboard.IBudgetAlert[] = [];
  for (const project of projects) {
    const totalLoggedHours = timelogSumMap.get(project.id) ?? 0;
    const budgetHours = project.budget_hours!;
    const utilizationPercent = (totalLoggedHours / budgetHours) * 100;
    if (utilizationPercent > 80) {
      budgetAlerts.push({
        projectId: project.id,
        projectName: project.name,
        budgetHours: budgetHours satisfies number as number,
        totalLoggedHours: (Math.round(totalLoggedHours * 100) /
          100) satisfies number as number,
        utilizationPercent: (Math.round(utilizationPercent * 100) /
          100) satisfies number as number,
      } satisfies IHrmTimeTrackingOrganizationDashboard.IBudgetAlert);
    }
  }
  // ----------------------------------------------------------
  // 5. Top 5 employees by hours this week
  // ----------------------------------------------------------
  const weeklyTimelogGroups =
    await MyGlobal.prisma.hrm_time_tracking_timelogs.groupBy({
      by: ["hrm_time_tracking_employee_id"],
      where: {
        employee: {
          hrm_time_tracking_organization_id: organizationId,
          deleted_at: null,
        },
        date: { gte: monday, lte: sunday },
        deleted_at: null,
      },
      _sum: { duration_minutes: true },
    });
  // Sort by total hours descending and take top 5
  weeklyTimelogGroups.sort((a, b) => {
    const aSum = a._sum.duration_minutes ?? 0;
    const bSum = b._sum.duration_minutes ?? 0;
    return bSum - aSum;
  });
  const topGroups = weeklyTimelogGroups.slice(0, 5);
  const topEmployeeIds = topGroups.map((g) => g.hrm_time_tracking_employee_id);
  // Fetch employee names from their member records
  const topEmployeesData =
    topEmployeeIds.length > 0
      ? await MyGlobal.prisma.hrm_time_tracking_employees.findMany({
          where: { id: { in: topEmployeeIds } },
          select: {
            id: true,
            member: { select: { display_name: true } },
          },
        })
      : [];
  const employeeNameMap = new Map(
    topEmployeesData.map((e) => [e.id, e.member.display_name]),
  );
  const topEmployees: IHrmTimeTrackingOrganizationDashboard.ITopEmployee[] =
    topGroups.map((g) => {
      const totalMinutes = g._sum.duration_minutes ?? 0;
      const totalHours = Math.round((totalMinutes / 60.0) * 100) / 100;
      return {
        employeeId: g.hrm_time_tracking_employee_id as string &
          tags.Format<"uuid">,
        employeeName:
          employeeNameMap.get(g.hrm_time_tracking_employee_id) ?? "",
        totalHours: totalHours satisfies number as number,
      } satisfies IHrmTimeTrackingOrganizationDashboard.ITopEmployee;
    });
  // ----------------------------------------------------------
  // Return response
  // ----------------------------------------------------------
  return {
    activeEmployeeCount: activeEmployeeCount satisfies number as number,
    weeklyHours: (Math.round(weeklyHours * 100) /
      100) satisfies number as number,
    pendingTimesheetCount: pendingTimesheetCount satisfies number as number,
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
// export async function getHrmTimeTrackingMemberDashboardOrganization(props: {
//   member: MemberPayload;
// }): Promise<IHrmTimeTrackingOrganizationDashboard> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------