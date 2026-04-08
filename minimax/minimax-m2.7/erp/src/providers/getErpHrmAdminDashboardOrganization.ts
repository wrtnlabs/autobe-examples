import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmOrganizationDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationDashboard";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ErpHrmEmployeeAtSummaryTransformer } from "../transformers/ErpHrmEmployeeAtSummaryTransformer";
import { ErpHrmProjectAtSummaryTransformer } from "../transformers/ErpHrmProjectAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmAdminDashboardOrganization(props: {
  admin: AdminPayload;
}): Promise<IErpHrmOrganizationDashboard> {
  // Get the first organization as the admin's organization context
  // Admins are system-wide entities without direct organization relation
  const org = await MyGlobal.prisma.erp_hrm_organizations.findFirstOrThrow({
    select: { id: true },
  });
  const orgId = org.id;
  // Calculate current week boundaries (Monday to Sunday in UTC)
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStartDate = new Date(now);
  weekStartDate.setUTCDate(now.getUTCDate() + mondayOffset);
  weekStartDate.setUTCHours(0, 0, 0, 0);
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setUTCDate(weekStartDate.getUTCDate() + 6);
  weekEndDate.setUTCHours(23, 59, 59, 999);
  // 1. Count active employees
  const employeeCount = await MyGlobal.prisma.erp_hrm_employees.count({
    where: {
      erp_hrm_organization_id: orgId,
      status: "active",
    },
  });
  // 2. Calculate total hours this week
  const totalHoursResult = await MyGlobal.prisma.erp_hrm_timelogs.aggregate({
    where: {
      employee: {
        erp_hrm_organization_id: orgId,
      },
      date: {
        gte: weekStartDate,
        lte: weekEndDate,
      },
    },
    _sum: {
      duration_minutes: true,
    },
  });
  const totalHoursThisWeek = (totalHoursResult._sum.duration_minutes ?? 0) / 60;
  // 3. Count pending timesheets (submitted status)
  const pendingTimesheetsCount = await MyGlobal.prisma.erp_hrm_timesheets.count(
    {
      where: {
        employee: {
          erp_hrm_organization_id: orgId,
        },
        status: "submitted",
      },
    },
  );
  // 4. Find projects with budget utilization > 80%
  const projectsWithTimelogs = await MyGlobal.prisma.erp_hrm_projects.findMany({
    where: {
      erp_hrm_organization_id: orgId,
      status: "active",
      budget_hours: { not: null },
      timelogs: {
        some: {
          date: { gte: weekStartDate, lte: weekEndDate },
        },
      },
    },
    select: {
      id: true,
      name: true,
      color: true,
      status: true,
      budget_hours: true,
      created_at: true,
      timelogs: {
        where: {
          date: { gte: weekStartDate, lte: weekEndDate },
        },
        select: {
          duration_minutes: true,
        },
      },
    },
  });
  // Filter and calculate utilization
  const budgetAlertProjectsRaw = projectsWithTimelogs
    .map((p) => {
      const actualMinutes = p.timelogs.reduce(
        (sum, t) => sum + (t.duration_minutes ?? 0),
        0,
      );
      const actualHours = actualMinutes / 60;
      const budgetHours = p.budget_hours!;
      const utilization = (actualHours / budgetHours) * 100;
      return { ...p, utilization };
    })
    .filter((p) => p.utilization > 80)
    .sort((a, b) => b.utilization - a.utilization)
    .slice(0, 50);
  const budgetAlertProjectIds = budgetAlertProjectsRaw.map((p) => p.id);
  // Fetch full project details with transformer
  const budgetAlertProjectsFull =
    await MyGlobal.prisma.erp_hrm_projects.findMany({
      where: { id: { in: budgetAlertProjectIds } },
      ...ErpHrmProjectAtSummaryTransformer.select(),
    });
  // Sort to match the utilization order
  const budgetAlertProjectsSorted = budgetAlertProjectIds
    .map((id) => budgetAlertProjectsFull.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => p !== undefined);
  const budgetAlertProjectsTransformed = await ArrayUtil.asyncMap(
    budgetAlertProjectsSorted,
    async (project) => ErpHrmProjectAtSummaryTransformer.transform(project),
  );
  // 5. Get top performers by hours this week
  const topTimelogsByEmployee = await MyGlobal.prisma.erp_hrm_timelogs.groupBy({
    by: ["erp_hrm_employee_id"],
    where: {
      employee: {
        erp_hrm_organization_id: orgId,
        status: "active",
      },
      date: {
        gte: weekStartDate,
        lte: weekEndDate,
      },
    },
    _sum: {
      duration_minutes: true,
    },
    orderBy: {
      _sum: {
        duration_minutes: "desc",
      },
    },
    take: 5,
  });
  const topEmployeeIds = topTimelogsByEmployee
    .filter((e) => (e._sum.duration_minutes ?? 0) > 0)
    .map((e) => e.erp_hrm_employee_id);
  // Fetch full employee details with transformer
  const topPerformersFull = await MyGlobal.prisma.erp_hrm_employees.findMany({
    where: { id: { in: topEmployeeIds } },
    ...ErpHrmEmployeeAtSummaryTransformer.select(),
  });
  // Maintain the order from groupBy (by hours DESC)
  const topPerformersSorted = topEmployeeIds
    .map((id) => topPerformersFull.find((e) => e.id === id))
    .filter((e): e is NonNullable<typeof e> => e !== undefined);
  const topPerformersTransformed = await ArrayUtil.asyncMap(
    topPerformersSorted,
    async (employee) => ErpHrmEmployeeAtSummaryTransformer.transform(employee),
  );
  return {
    employeeCount: employeeCount as number & tags.Type<"int32">,
    totalHoursThisWeek,
    pendingTimesheetsCount: pendingTimesheetsCount as number &
      tags.Type<"int32">,
    budgetAlertProjects: budgetAlertProjectsTransformed,
    topPerformers: topPerformersTransformed,
  };
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
// import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
// import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
// import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
// import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
// import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
// import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getErpHrmAdminDashboardOrganization(props: {
//   admin: AdminPayload;
// }): Promise<IErpHrmOrganizationDashboard> {
//   return {
//     employeeCount: ...,
//     totalHoursThisWeek: ...,
//     pendingTimesheetsCount: ...,
//     budgetAlertProjects: await ArrayUtil.asyncMap(..., (r) => ErpHrmProjectAtSummaryTransformer.transform(r)),
//     topPerformers: await ArrayUtil.asyncMap(..., (r) => ErpHrmEmployeeAtSummaryTransformer.transform(r)),
//   };
// }
// ```
//--------------------------------------------------------------