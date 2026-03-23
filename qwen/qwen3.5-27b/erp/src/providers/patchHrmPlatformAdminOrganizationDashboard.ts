import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformOrganizationDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationDashboard";
import { IHrmPlatformOrganizationDashboardBudgetWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationDashboardBudgetWarning";
import { IHrmPlatformOrganizationDashboardEmployeeByDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationDashboardEmployeeByDepartment";
import { IHrmPlatformOrganizationDashboardTopPerformer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationDashboardTopPerformer";
import { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
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

export async function patchHrmPlatformAdminOrganizationDashboard(props: {
  admin: AdminPayload;
  body: IHrmPlatformOrganizationDashboard.IRequest;
}): Promise<IHrmPlatformOrganizationDashboard> {
  // Get admin record to establish identity
  const admin = await MyGlobal.prisma.hrm_platform_admins.findUniqueOrThrow({
    where: { id: props.admin.id },
    select: { id: true },
  });
  // Get all organizations for admin access (admins can access all organizations)
  const organizations =
    await MyGlobal.prisma.hrm_platform_organizations.findMany({
      where: { deleted_at: null },
      select: { id: true },
    });
  // Use the first organization for dashboard (or implement organization selection logic)
  if (organizations.length === 0) {
    throw new HttpException("No organizations available", 404);
  }
  const organizationId = organizations[0].id;
  // Parse date range - default to current calendar month
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const defaultStartDate = new Date(currentYear, currentMonth, 1);
  const defaultEndDate = new Date(
    currentYear,
    currentMonth + 1,
    0,
    23,
    59,
    59,
    999,
  );
  const startDate = props.body.startDate
    ? new Date(props.body.startDate)
    : defaultStartDate;
  const endDate = props.body.endDate
    ? new Date(props.body.endDate)
    : defaultEndDate;
  // 1. Employee Statistics - total count
  const totalEmployees = await MyGlobal.prisma.hrm_platform_employees.count({
    where: {
      organization_id: organizationId,
      status: "active",
      deleted_at: null,
    },
  });
  // Employees by employment type
  const employeesByType = await MyGlobal.prisma.hrm_platform_employees.groupBy({
    by: ["employment_type"],
    where: {
      organization_id: organizationId,
      status: "active",
      deleted_at: null,
    },
    _count: true,
  });
  const fullTime =
    employeesByType.find((e) => e.employment_type === "full-time")?._count ?? 0;
  const partTime =
    employeesByType.find((e) => e.employment_type === "part-time")?._count ?? 0;
  const contractor =
    employeesByType.find((e) => e.employment_type === "contractor")?._count ??
    0;
  const intern =
    employeesByType.find((e) => e.employment_type === "intern")?._count ?? 0;
  // Employees by department
  const employeesByDepartment =
    await MyGlobal.prisma.hrm_platform_employees.groupBy({
      by: ["department_id"],
      where: {
        organization_id: organizationId,
        status: "active",
        deleted_at: null,
        department_id: { not: null },
      },
      _count: true,
    });
  const departmentIds = employeesByDepartment
    .map((d) => d.department_id!)
    .filter((id): id is string => id != null);
  const departmentDetails =
    await MyGlobal.prisma.hrm_platform_departments.findMany({
      where: {
        id: { in: departmentIds },
        organization: { id: organizationId },
        deleted_at: null,
      },
      select: { id: true, name: true },
    });
  const employeesByDepartmentResult: IHrmPlatformOrganizationDashboardEmployeeByDepartment[] =
    employeesByDepartment.map((emp) => {
      const dept = departmentDetails.find((d) => d.id === emp.department_id);
      return {
        departmentName: dept?.name ?? "Unknown",
        employeeCount: emp._count,
      };
    });
  // 2. Get active employee IDs for time tracking queries
  const activeEmployeeIds =
    await MyGlobal.prisma.hrm_platform_employees.findMany({
      where: {
        organization_id: organizationId,
        status: "active",
        deleted_at: null,
      },
      select: { id: true },
    });
  const employeeIdList = activeEmployeeIds.map((e) => e.id);
  // Total hours logged
  const timelogData = await MyGlobal.prisma.hrm_platform_timelogs.aggregate({
    where: {
      hrm_platform_employee_id: { in: employeeIdList },
      date: {
        gte: startDate,
        lte: endDate,
      },
      deleted_at: null,
    },
    _sum: { duration: true },
  });
  const totalHoursLogged = (timelogData._sum.duration ?? 0) / 60.0;
  const averageHoursPerEmployee =
    totalEmployees > 0 ? totalHoursLogged / totalEmployees : 0;
  // Active timers (stopped_at is null)
  const activeTimers = await MyGlobal.prisma.hrm_platform_timers.count({
    where: {
      hrm_platform_employee_id: { in: employeeIdList },
      stopped_at: null,
      deleted_at: null,
    },
  });
  // 3. Timesheet Statistics
  const timesheetsByStatus =
    await MyGlobal.prisma.hrm_platform_timesheets.groupBy({
      by: ["status"],
      where: {
        hrm_platform_employee_id: { in: employeeIdList },
        deleted_at: null,
      },
      _count: true,
    });
  const draftCount =
    timesheetsByStatus.find((t) => t.status === "draft")?._count ?? 0;
  const submittedCount =
    timesheetsByStatus.find((t) => t.status === "submitted")?._count ?? 0;
  const approvedCount =
    timesheetsByStatus.find((t) => t.status === "approved")?._count ?? 0;
  const rejectedCount =
    timesheetsByStatus.find((t) => t.status === "rejected")?._count ?? 0;
  const pendingApprovals = submittedCount;
  // 4. Project Statistics
  const projectsByStatus = await MyGlobal.prisma.hrm_platform_projects.groupBy({
    by: ["status"],
    where: {
      organization_id: organizationId,
      deleted_at: null,
    },
    _count: true,
  });
  const activeProjects =
    projectsByStatus.find((p) => p.status === "active")?._count ?? 0;
  const completedProjects =
    projectsByStatus.find((p) => p.status === "completed")?._count ?? 0;
  const archivedProjects =
    projectsByStatus.find((p) => p.status === "archived")?._count ?? 0;
  // Budget warnings - projects exceeding budget
  const projectsWithBudget =
    await MyGlobal.prisma.hrm_platform_projects.findMany({
      where: {
        organization_id: organizationId,
        budget_hours: { not: null },
        deleted_at: null,
      },
      select: { id: true, name: true, budget_hours: true },
    });
  const budgetWarnings: IHrmPlatformOrganizationDashboardBudgetWarning[] = [];
  for (const project of projectsWithBudget) {
    const projectTimelogs =
      await MyGlobal.prisma.hrm_platform_timelogs.aggregate({
        where: {
          hrm_platform_project_id: project.id,
          deleted_at: null,
        },
        _sum: { duration: true },
      });
    const actualHours = (projectTimelogs._sum.duration ?? 0) / 60.0;
    if (actualHours > project.budget_hours!) {
      const overagePercentage =
        ((actualHours - project.budget_hours!) / project.budget_hours!) * 100;
      budgetWarnings.push({
        projectId: project.id,
        projectName: project.name,
        budgetHours: project.budget_hours!,
        actualHours: actualHours,
        overagePercentage: Math.round(overagePercentage * 100) / 100,
      });
    }
  }
  // 5. Top Performers - top 5 employees by hours logged
  const topPerformerData = await MyGlobal.prisma.hrm_platform_timelogs.groupBy({
    by: ["hrm_platform_employee_id"],
    where: {
      hrm_platform_employee_id: { in: employeeIdList },
      date: {
        gte: startDate,
        lte: endDate,
      },
      deleted_at: null,
    },
    _sum: { duration: true },
    orderBy: {
      _sum: { duration: "desc" },
    },
    take: 5,
  });
  const topPerformers: IHrmPlatformOrganizationDashboardTopPerformer[] = [];
  for (const performer of topPerformerData) {
    const employee =
      await MyGlobal.prisma.hrm_platform_employees.findUniqueOrThrow({
        where: { id: performer.hrm_platform_employee_id },
        include: {
          member: true,
          department: {
            include: {
              parent: {
                include: {
                  organization: {
                    include: {
                      owner: true,
                      setting: true,
                      logo: true,
                    },
                  },
                },
              },
              organization: {
                include: {
                  owner: true,
                  setting: true,
                  logo: true,
                },
              },
            },
          },
          role: {
            include: {
              organization: {
                include: {
                  owner: true,
                  setting: true,
                  logo: true,
                },
              },
            },
          },
        },
      });
    const totalHours = (performer._sum.duration ?? 0) / 60.0;
    // Build employee summary
    const memberSummary: IHrmPlatformMember.ISummary = {
      id: employee.member.id,
      email: employee.member.email,
      created_at: toISOStringSafe(employee.member.created_at),
    };
    const organizationSummary = (
      org: any,
    ): IHrmPlatformOrganization.ISummary => ({
      id: org.id,
      name: org.name,
      description: org.description,
      owner: {
        id: org.owner.id,
        email: org.owner.email,
        created_at: toISOStringSafe(org.owner.created_at),
      } satisfies IHrmPlatformMember.ISummary,
      setting: {
        id: org.setting.id,
        currency: org.setting.currency,
        timezone: org.setting.timezone,
        fiscal_year_start_month: org.setting.fiscal_year_start_month,
        created_at: toISOStringSafe(org.setting.created_at),
        updated_at: toISOStringSafe(org.setting.updated_at),
      } satisfies IHrmPlatformOrganizationSetting,
      logo: {
        id: org.logo.id,
        organization: organizationSummary(
          org,
        ) satisfies IHrmPlatformOrganization.ISummary,
        image_url: org.logo.image_url,
        created_at: toISOStringSafe(org.logo.created_at),
        updated_at: toISOStringSafe(org.logo.updated_at),
        deleted_at: org.logo.deleted_at
          ? toISOStringSafe(org.logo.deleted_at)
          : null,
      } satisfies IHrmPlatformOrganizationLogo,
      created_at: toISOStringSafe(org.created_at),
      updated_at: toISOStringSafe(org.updated_at),
      deleted_at: org.deleted_at ? toISOStringSafe(org.deleted_at) : null,
    });
    const departmentSummary = (dept: any): IHrmPlatformDepartment.ISummary => ({
      id: dept.id,
      name: dept.name,
      description: dept.description,
      parent: dept.parent
        ? ({
            id: dept.parent.id,
            name: dept.parent.name,
            description: dept.parent.description,
            parent: null,
            organization: organizationSummary(
              dept.parent.organization,
            ) satisfies IHrmPlatformOrganization.ISummary,
            created_at: toISOStringSafe(dept.parent.created_at),
            updated_at: toISOStringSafe(dept.parent.updated_at),
            deleted_at: dept.parent.deleted_at
              ? toISOStringSafe(dept.parent.deleted_at)
              : null,
          } satisfies IHrmPlatformDepartment.ISummary)
        : null,
      organization: organizationSummary(
        dept.organization,
      ) satisfies IHrmPlatformOrganization.ISummary,
      created_at: toISOStringSafe(dept.created_at),
      updated_at: toISOStringSafe(dept.updated_at),
      deleted_at: dept.deleted_at ? toISOStringSafe(dept.deleted_at) : null,
    });
    const roleSummary: IHrmPlatformRole.ISummary = {
      id: employee.role.id,
      name: employee.role.name,
      description: employee.role.description,
      is_builtin: employee.role.is_builtin,
      built_in_type: employee.role.built_in_type,
      created_at: toISOStringSafe(employee.role.created_at),
      organization: organizationSummary(
        employee.role.organization,
      ) satisfies IHrmPlatformOrganization.ISummary,
      employee_count: 0,
      permission_count: 0,
    };
    const employeeSummary: IHrmPlatformEmployee.ISummary = {
      id: employee.id,
      employment_type: employee.employment_type,
      status: employee.status,
      created_at: toISOStringSafe(employee.created_at),
      member: memberSummary,
      department: employee.department
        ? departmentSummary(employee.department)
        : null,
      role: roleSummary,
    };
    topPerformers.push({
      employee: employeeSummary,
      totalHoursLogged: totalHours,
    });
  }
  return {
    totalEmployees,
    employeesByType: {
      fullTime,
      partTime,
      contractor,
      intern,
    },
    employeesByDepartment: employeesByDepartmentResult,
    totalHoursLogged,
    averageHoursPerEmployee,
    activeTimers,
    timesheetsByStatus: {
      draft: draftCount,
      submitted: submittedCount,
      approved: approvedCount,
      rejected: rejectedCount,
    },
    pendingApprovals,
    projectsByStatus: {
      active: activeProjects,
      completed: completedProjects,
      archived: archivedProjects,
    },
    budgetWarnings,
    topPerformers,
  };
}
