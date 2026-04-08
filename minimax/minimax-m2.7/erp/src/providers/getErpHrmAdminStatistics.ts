import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmStatistic";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// Helper: Get current week boundaries as ISO strings (Monday 00:00:00 to Sunday 23:59:59)
function getCurrentWeekBoundaries(): {
  weekStart: string & tags.Format<"date-time">;
  weekEnd: string & tags.Format<"date-time">;
} {
  // Use Date only for computation, return string types
  const now: Date = new Date();
  const year: number = now.getFullYear();
  const month: number = now.getMonth();
  const dayOfMonth: number = now.getDate();
  const dayOfWeek: number = now.getDay();
  // Calculate Monday offset (days to subtract to get to Monday)
  const daysToMonday: number = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const mondayDate: number = dayOfMonth - daysToMonday;
  const sundayDate: number = mondayDate + 6;
  const pad = (n: number): string => n.toString().padStart(2, "0");
  // Handle month/year overflow when Monday is in previous month
  let effectiveMonth: number = month;
  let effectiveYear: number = year;
  let effectiveMondayDay: number = mondayDate;
  let effectiveSundayDay: number = sundayDate;
  if (mondayDate < 1) {
    effectiveMonth = month - 1;
    if (effectiveMonth < 1) {
      effectiveMonth = 12;
      effectiveYear = year - 1;
    }
    const prevMonthDays: number = new Date(
      effectiveYear,
      effectiveMonth,
      0,
    ).getDate();
    effectiveMondayDay = prevMonthDays + mondayDate;
    effectiveSundayDay = effectiveMondayDay + 6;
  }
  const weekStartStr: string = `${effectiveYear}-${pad(effectiveMonth + 1)}-${pad(effectiveMondayDay)}T00:00:00.000Z`;
  const weekEndStr: string = `${effectiveYear}-${pad(effectiveMonth + 1)}-${pad(effectiveSundayDay)}T23:59:59.999Z`;
  return {
    weekStart: typia.assert<string & tags.Format<"date-time">>(weekStartStr),
    weekEnd: typia.assert<string & tags.Format<"date-time">>(weekEndStr),
  };
}
export async function getErpHrmAdminStatistics(props: {
  admin: AdminPayload;
}): Promise<IErpHrmStatistic> {
  const session =
    await MyGlobal.prisma.erp_hrm_admin_sessions.findUniqueOrThrow({
      where: { id: props.admin.session_id },
      select: { erp_hrm_admin_id: true },
    });
  const admin = await MyGlobal.prisma.erp_hrm_admins.findUniqueOrThrow({
    where: { id: session.erp_hrm_admin_id },
    select: { id: true },
  });
  const organization = await MyGlobal.prisma.erp_hrm_organizations.findFirst({
    where: { owner_id: admin.id },
    select: { id: true },
  });
  if (!organization) {
    throw new HttpException("Admin has no associated organization", 400);
  }
  const orgId: string & tags.Format<"uuid"> = organization.id;
  const { weekStart, weekEnd } = getCurrentWeekBoundaries();
  // Count active employees
  const employeesCount = await MyGlobal.prisma.erp_hrm_employees.count({
    where: { erp_hrm_organization_id: orgId, status: "active" },
  });
  // Calculate weekly hours using aggregate
  const weeklyHoursResult = await MyGlobal.prisma.erp_hrm_timelogs.aggregate({
    where: {
      employee: { erp_hrm_organization_id: orgId },
      date: { gte: weekStart, lte: weekEnd },
    },
    _sum: { duration_minutes: true },
  });
  const weeklyHours: number =
    (weeklyHoursResult._sum.duration_minutes ?? 0) / 60;
  // Count pending timesheets
  const pendingTimesheetsCount = await MyGlobal.prisma.erp_hrm_timesheets.count(
    {
      where: {
        employee: { erp_hrm_organization_id: orgId },
        status: "submitted",
      },
    },
  );
  // Get projects with budget_hours > 0
  const projects = await MyGlobal.prisma.erp_hrm_projects.findMany({
    where: { erp_hrm_organization_id: orgId, budget_hours: { gt: 0 } },
    select: { id: true, name: true, color: true, budget_hours: true },
  });
  // Calculate utilization and filter >= 80%
  const highUtilizationProjects: IErpHrmStatistic.IHighUtilizationProject[] =
    [];
  for (const project of projects) {
    const budgetHours: number = project.budget_hours ?? 0;
    const projectHoursResult = await MyGlobal.prisma.erp_hrm_timelogs.aggregate(
      {
        where: {
          erp_hrm_project_id: project.id,
          date: { gte: weekStart, lte: weekEnd },
        },
        _sum: { duration_minutes: true },
      },
    );
    const actualHours: number =
      (projectHoursResult._sum.duration_minutes ?? 0) / 60;
    const utilizationPercentage: number = (actualHours / budgetHours) * 100;
    if (utilizationPercentage >= 80) {
      const projectItem: IErpHrmStatistic.IHighUtilizationProject = {
        name: project.name,
        color: project.color,
        budget_hours: budgetHours,
        utilization_percentage: utilizationPercentage,
      };
      highUtilizationProjects.push(projectItem);
    }
  }
  // Sort by utilization descending and limit to 10
  highUtilizationProjects.sort(
    (a, b) => b.utilization_percentage - a.utilization_percentage,
  );
  const limitedProjects: IErpHrmStatistic.IHighUtilizationProject[] =
    highUtilizationProjects.slice(0, 10);
  // Get top 5 employees this week
  const employeeTimelogs = await MyGlobal.prisma.erp_hrm_timelogs.groupBy({
    by: ["erp_hrm_employee_id"],
    where: {
      employee: { erp_hrm_organization_id: orgId },
      date: { gte: weekStart, lte: weekEnd },
    },
    _sum: { duration_minutes: true },
    orderBy: { _sum: { duration_minutes: "desc" } },
    take: 5,
  });
  const topEmployeeIds: string[] = employeeTimelogs.map(
    (et) => et.erp_hrm_employee_id,
  );
  const topEmployeesData = await MyGlobal.prisma.erp_hrm_employees.findMany({
    where: { id: { in: topEmployeeIds } },
    select: {
      id: true,
      member: { select: { display_name: true } },
      department: { select: { name: true } },
    },
  });
  const topEmployeesMap: Map<
    string,
    {
      name: string;
      department: string | null;
    }
  > = new Map();
  for (const emp of topEmployeesData) {
    topEmployeesMap.set(emp.id, {
      name: emp.member.display_name,
      department: emp.department?.name ?? null,
    });
  }
  const topEmployees: IErpHrmStatistic.ITopEmployee[] = employeeTimelogs.map(
    (et) => {
      const empData = topEmployeesMap.get(et.erp_hrm_employee_id);
      const topEmp: IErpHrmStatistic.ITopEmployee = {
        name: empData?.name ?? "",
        department: empData?.department ?? null,
        hours: (et._sum.duration_minutes ?? 0) / 60,
      };
      return topEmp;
    },
  );
  const result: IErpHrmStatistic = {
    employees_count: typia.assert<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(employeesCount),
    weekly_hours: weeklyHours,
    pending_timesheets_count: typia.assert<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(pendingTimesheetsCount),
    high_utilization_projects: limitedProjects,
    top_employees: topEmployees,
  };
  return result;
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
// import { IErpHrmStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmStatistic";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getErpHrmAdminStatistics(props: {
//   admin: AdminPayload;
// }): Promise<IErpHrmStatistic> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------