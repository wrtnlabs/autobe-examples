import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { IHrmOrganizationDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganizationDashboard";
import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmEmployeeAtSummaryTransformer } from "../transformers/HrmEmployeeAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmMemberDashboardOrganizationOrganizationId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
}): Promise<IHrmOrganizationDashboard> {
  // Verify organization exists
  const organization = await MyGlobal.prisma.hrm_organizations.findFirst({
    where: {
      id: props.organizationId,
      deleted_at: null,
    },
  });
  if (organization === null) {
    throw new HttpException("Organization not found", 404);
  }
  // Verify member belongs to organization
  const employee = await MyGlobal.prisma.hrm_employees.findFirst({
    where: {
      organization_id: props.organizationId,
      user_id: props.member.id,
      deleted_at: null,
    },
  });
  if (employee === null) {
    throw new HttpException("You are not a member of this organization", 403);
  }
  // Calculate current week boundaries (Monday to Sunday)
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
  monday.setUTCHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  sunday.setUTCHours(23, 59, 59, 999);
  // Total active employees
  const totalEmployeeCount = await MyGlobal.prisma.hrm_employees.count({
    where: {
      organization_id: props.organizationId,
      status: "active",
      deleted_at: null,
    },
  });
  // Get all employee IDs for the organization (needed for timelogs/timesheets filtering)
  const employeeIds = await MyGlobal.prisma.hrm_employees.findMany({
    where: {
      organization_id: props.organizationId,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  const employeeIdList = employeeIds.map((e) => e.id);
  // Hours this week (sum of timelog durations)
  const timelogsThisWeek = await MyGlobal.prisma.hrm_timelogs.groupBy({
    by: ["hrm_employee_id"],
    where: {
      hrm_employee_id: {
        in: employeeIdList,
      },
      date: {
        gte: monday,
        lte: sunday,
      },
      deleted_at: null,
    },
    _sum: {
      duration_minutes: true,
    },
  });
  const totalMinutes = timelogsThisWeek.reduce(
    (sum, t) => sum + (t._sum?.duration_minutes ?? 0),
    0,
  );
  const hoursThisWeek = totalMinutes / 60;
  // Pending timesheets count
  const pendingTimesheetCount = await MyGlobal.prisma.hrm_timesheets.count({
    where: {
      hrm_employee_id: {
        in: employeeIdList,
      },
      status: "submitted",
      deleted_at: null,
    },
  });
  // Budget utilization
  const projectsWithBudget = await MyGlobal.prisma.hrm_projects.findMany({
    where: {
      hrm_organization_id: props.organizationId,
      status: "active",
      budget_hours: {
        not: null,
      },
      deleted_at: null,
    },
    select: {
      id: true,
      budget_hours: true,
    },
  });
  let budgetUtilization: (number & tags.Minimum<0> & tags.Maximum<100>) | null =
    null;
  if (projectsWithBudget.length > 0) {
    const totalBudgetHours = projectsWithBudget.reduce(
      (sum, p) => sum + (p.budget_hours ?? 0),
      0,
    );
    const projectIds = projectsWithBudget.map((p) => p.id);
    const actualHoursByProject = await MyGlobal.prisma.hrm_timelogs.groupBy({
      by: ["hrm_project_id"],
      where: {
        hrm_project_id: {
          in: projectIds,
        },
        hrm_employee_id: {
          in: employeeIdList,
        },
        date: {
          gte: monday,
          lte: sunday,
        },
        deleted_at: null,
      },
      _sum: {
        duration_minutes: true,
      },
    });
    const totalActualMinutes = actualHoursByProject.reduce(
      (sum, t) => sum + (t._sum?.duration_minutes ?? 0),
      0,
    );
    const totalActualHours = totalActualMinutes / 60;
    if (totalBudgetHours > 0) {
      const utilization = (totalActualHours / totalBudgetHours) * 100;
      budgetUtilization = Math.min(100, Math.max(0, utilization));
    }
  }
  // Get all employees with all required relations for transformer
  const allEmployees = await MyGlobal.prisma.hrm_employees.findMany({
    where: {
      organization_id: props.organizationId,
      deleted_at: null,
    },
    include: {
      organization:
        HrmEmployeeAtSummaryTransformer.select().select.organization,
      user: HrmEmployeeAtSummaryTransformer.select().select.user,
      role: HrmEmployeeAtSummaryTransformer.select().select.role,
      department: HrmEmployeeAtSummaryTransformer.select().select.department,
      snapshots: true,
      contracts: true,
      projectMembers: true,
      assignedTasks: true,
      timelogs: {
        where: {
          date: {
            gte: monday,
            lte: sunday,
          },
          deleted_at: null,
        },
        select: {
          id: true,
          date: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          description: true,
          hrm_employee_id: true,
          hrm_project_id: true,
          hrm_task_id: true,
          duration_minutes: true,
          billable: true,
        },
      },
      timesheets: true,
      activeTimers: true,
    },
  });
  // Calculate hours and sort
  const employeesWithHours = await ArrayUtil.asyncMap(
    allEmployees,
    async (emp) => {
      const totalMinutes = emp.timelogs.reduce(
        (sum, t) => sum + t.duration_minutes,
        0,
      );
      return {
        employee: emp,
        hours: totalMinutes / 60,
      };
    },
  );
  // Filter, sort, and limit to top 5
  const topEmployeesRaw = employeesWithHours
    .filter((e) => e.hours > 0)
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 5);
  // Transform to ISummary format
  const topEmployees = await ArrayUtil.asyncMap(
    topEmployeesRaw,
    async (item) => {
      const transformed = await HrmEmployeeAtSummaryTransformer.transform(
        item.employee,
      );
      return transformed;
    },
  );
  return {
    totalEmployeeCount,
    hoursThisWeek,
    pendingTimesheetCount,
    budgetUtilization,
    topEmployees,
  } satisfies IHrmOrganizationDashboard;
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
// import { IHrmOrganizationDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganizationDashboard";
// import { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
// import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
// import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
// import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
// import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getHrmMemberDashboardOrganizationOrganizationId(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
// }): Promise<IHrmOrganizationDashboard> {
//   return {
//     totalEmployeeCount: ...,
//     hoursThisWeek: ...,
//     pendingTimesheetCount: ...,
//     budgetUtilization: ...,
//     topEmployees: await ArrayUtil.asyncMap(..., (r) => HrmEmployeeAtSummaryTransformer.transform(r)),
//   };
// }
// ```
//--------------------------------------------------------------