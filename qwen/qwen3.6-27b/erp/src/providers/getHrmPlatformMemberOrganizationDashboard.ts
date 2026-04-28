import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformHighUtilizationProjectSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformHighUtilizationProjectSummary";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganizationDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationDashboard";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformOrganizationDashboardAtTopEmployeeByHourTransformer } from "../transformers/HrmPlatformOrganizationDashboardAtTopEmployeeByHourTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmPlatformMemberOrganizationDashboard(props: {
  member: MemberPayload;
}): Promise<IHrmPlatformOrganizationDashboard> {
  const activeEmployee = await MyGlobal.prisma.hrm_platform_employees.findFirst(
    {
      where: {
        hrm_platform_member_id: props.member.id,
        status: "active",
        deleted_at: null,
      },
      select: {
        hrm_platform_organization_id: true,
      },
    },
  );
  if (activeEmployee === null) {
    throw new HttpException("Organization context not found", 403);
  }
  const orgId = activeEmployee.hrm_platform_organization_id;
  // Calculate current week boundaries: Monday 00:00:00.000 to Sunday 23:59:59.999
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const mondayStart = new Date(now);
  mondayStart.setDate(now.getDate() - mondayOffset);
  mondayStart.setHours(0, 0, 0, 0);
  const sundayEnd = new Date(mondayStart);
  sundayEnd.setDate(mondayStart.getDate() + 6);
  sundayEnd.setHours(23, 59, 59, 999);
  // 1. Active employees count
  const activeEmployeesCount =
    await MyGlobal.prisma.hrm_platform_employees.count({
      where: {
        hrm_platform_organization_id: orgId,
        status: "active",
        deleted_at: null,
      },
    });
  // 2. Total hours this week
  const weeklyAggregate = await MyGlobal.prisma.hrm_platform_timelogs.aggregate(
    {
      where: {
        deleted_at: null,
        date: {
          gte: mondayStart,
          lte: sundayEnd,
        },
        employee: {
          hrm_platform_organization_id: orgId,
        },
      },
      _sum: {
        duration_minutes: true,
      },
    },
  );
  const totalHoursThisWeek = (weeklyAggregate._sum.duration_minutes ?? 0) / 60;
  // 3. Pending timesheets count
  const pendingTimesheetsCount =
    await MyGlobal.prisma.hrm_platform_timesheets.count({
      where: {
        status: "submitted",
        employee: {
          hrm_platform_organization_id: orgId,
        },
      },
    });
  // 4. Budget high-utilization projects (>= 80%)
  const projectsWithBudget =
    await MyGlobal.prisma.hrm_platform_projects.findMany({
      where: {
        hrm_platform_organization_id: orgId,
        deleted_at: null,
        budget: {
          not: null,
        },
      },
      select: {
        id: true,
        name: true,
        budget: true,
      },
    });
  const projectTimelogSums =
    await MyGlobal.prisma.hrm_platform_timelogs.groupBy({
      by: ["hrm_platform_project_id"],
      where: {
        deleted_at: null,
        employee: {
          hrm_platform_organization_id: orgId,
        },
      },
      _sum: {
        duration_minutes: true,
      },
    });
  const budgetHighUtilizationProjects: IHrmPlatformHighUtilizationProjectSummary[] =
    [];
  for (const project of projectsWithBudget) {
    const matchingSum = projectTimelogSums.find(
      (s) => s.hrm_platform_project_id === project.id,
    );
    const actualHours = (matchingSum?._sum.duration_minutes ?? 0) / 60;
    if (project.budget === null) {
      continue;
    }
    const utilizationPercentage = (actualHours / project.budget) * 100;
    if (utilizationPercentage >= 80) {
      budgetHighUtilizationProjects.push({
        id: project.id,
        name: project.name,
        budgetHours: project.budget,
        actualHours: actualHours,
        utilizationPercentage: Math.round(utilizationPercentage * 100) / 100,
      } satisfies IHrmPlatformHighUtilizationProjectSummary);
    }
  }
  // 5. Top 5 employees by hours this week
  const weekEmployeeSelect = {
    ...HrmPlatformOrganizationDashboardAtTopEmployeeByHourTransformer.select()
      .select,
    timelogs: {
      where: {
        deleted_at: null,
        date: {
          gte: mondayStart,
          lte: sundayEnd,
        },
      },
      select: {
        duration_minutes: true,
      },
    } satisfies Prisma.hrm_platform_timelogsFindManyArgs,
  } satisfies Prisma.hrm_platform_employeesFindManyArgs["select"];
  const weekEmployees = await MyGlobal.prisma.hrm_platform_employees.findMany({
    where: {
      hrm_platform_organization_id: orgId,
      status: "active",
      deleted_at: null,
    },
    select: weekEmployeeSelect,
  });
  const employeesWithHours = weekEmployees
    .filter((emp) => emp.timelogs.length > 0)
    .map((emp) => ({
      emp: emp,
      totalHours:
        emp.timelogs.reduce((sum, t) => sum + t.duration_minutes, 0) / 60,
    }))
    .sort((a, b) => b.totalHours - a.totalHours)
    .slice(0, 5)
    .map((item) => item.emp);
  const topEmployeesByHours = await ArrayUtil.asyncMap(
    employeesWithHours,
    HrmPlatformOrganizationDashboardAtTopEmployeeByHourTransformer.transform,
  );
  return {
    activeEmployeesCount: activeEmployeesCount,
    totalHoursThisWeek: totalHoursThisWeek,
    pendingTimesheetsCount: pendingTimesheetsCount,
    budgetHighUtilizationProjects: budgetHighUtilizationProjects,
    topEmployeesByHours: topEmployeesByHours,
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
// import { IHrmPlatformOrganizationDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationDashboard";
// import { IHrmPlatformHighUtilizationProjectSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformHighUtilizationProjectSummary";
// import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
// import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getHrmPlatformMemberOrganizationDashboard(props: {
//   member: MemberPayload;
// }): Promise<IHrmPlatformOrganizationDashboard> {
//   return {
//     activeEmployeesCount: ...,
//     totalHoursThisWeek: ...,
//     pendingTimesheetsCount: ...,
//     budgetHighUtilizationProjects: ...,
//     topEmployeesByHours: await ArrayUtil.asyncMap(..., (r) => HrmPlatformOrganizationDashboardAtTopEmployeeByHourTransformer.transform(r)),
//   };
// }
// ```
//--------------------------------------------------------------