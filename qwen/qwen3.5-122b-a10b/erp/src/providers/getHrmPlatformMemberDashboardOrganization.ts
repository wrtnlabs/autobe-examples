import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IOrganizationDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IOrganizationDashboard";
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

export async function getHrmPlatformMemberDashboardOrganization(props: {
  member: MemberPayload;
}): Promise<IOrganizationDashboard> {
  // Get member's employee record to find organization
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_user_id: props.member.id,
      deleted_at: null,
    },
    select: {
      hrm_platform_organization_id: true,
    },
  });
  if (!employee?.hrm_platform_organization_id) {
    throw new HttpException("No organization context", 400);
  }
  const organizationId = employee.hrm_platform_organization_id;
  // 1. Count active employees
  const activeEmployeeCount =
    await MyGlobal.prisma.hrm_platform_employees.count({
      where: {
        hrm_platform_organization_id: organizationId,
        status: "active",
        deleted_at: null,
      },
    });
  // 2. Calculate weekly hours total (current week Monday to Sunday)
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
  monday.setUTCHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  sunday.setUTCHours(23, 59, 59, 999);
  const timelogsThisWeek = await MyGlobal.prisma.hrm_platform_timelogs.findMany(
    {
      where: {
        date: {
          gte: monday,
          lte: sunday,
        },
        deleted_at: null,
      },
      select: { duration_minutes: true },
    },
  );
  const weeklyHoursTotal =
    timelogsThisWeek.reduce((total, log) => total + log.duration_minutes, 0) /
    60;
  // 3. Count pending timesheets (via employee's organization)
  const pendingTimesheetCount =
    await MyGlobal.prisma.hrm_platform_timesheets.count({
      where: {
        employee: {
          hrm_platform_organization_id: organizationId,
        },
        status: { in: ["submitted", "draft"] },
        deleted_at: null,
      },
    });
  // 4. Get projects with budget > 0
  const projects = await MyGlobal.prisma.hrm_platform_projects.findMany({
    where: {
      hrm_platform_organization_id: organizationId,
      budget_hours: { gt: 0 },
      deleted_at: null,
    },
    select: { id: true, name: true, budget_hours: true },
  });
  // Calculate budget utilization for each project
  const budgetAlerts: IOrganizationDashboard.IBudgetAlert[] = [];
  for (const project of projects) {
    if (project.budget_hours === null) continue;
    const projectTimelogs =
      await MyGlobal.prisma.hrm_platform_timelogs.findMany({
        where: {
          hrm_platform_project_id: project.id,
          deleted_at: null,
        },
        select: { duration_minutes: true },
      });
    const actualHours =
      projectTimelogs.reduce((total, log) => total + log.duration_minutes, 0) /
      60;
    const utilizationPercentage = (actualHours / project.budget_hours) * 100;
    if (utilizationPercentage > 80) {
      budgetAlerts.push({
        project_id: project.id as string & tags.Format<"uuid">,
        project_name: project.name,
        budget_hours: project.budget_hours,
        actual_hours: actualHours,
        utilization_percentage: utilizationPercentage,
      });
    }
  }
  // 5. Get top 5 performers by hours this week
  const employees = await MyGlobal.prisma.hrm_platform_employees.findMany({
    where: {
      hrm_platform_organization_id: organizationId,
      deleted_at: null,
    },
    select: {
      id: true,
      position: true,
      employment_type: true,
      status: true,
      hrm_platform_user_id: true,
      hrm_platform_role_id: true,
      hrm_platform_department_id: true,
    },
  });
  const topPerformersData = await ArrayUtil.asyncMap(
    employees,
    async (employee) => {
      const timelogs = await MyGlobal.prisma.hrm_platform_timelogs.findMany({
        where: {
          hrm_platform_employee_id: employee.id,
          date: {
            gte: monday,
            lte: sunday,
          },
          deleted_at: null,
        },
        select: { duration_minutes: true },
      });
      const totalMinutes = timelogs.reduce(
        (total, log) => total + log.duration_minutes,
        0,
      );
      return {
        employee,
        total_minutes: totalMinutes,
      };
    },
  );
  // Sort by total minutes and take top 5
  topPerformersData.sort((a, b) => b.total_minutes - a.total_minutes);
  const top5 = topPerformersData.slice(0, 5);
  const topPerformers: IOrganizationDashboard.ITopPerformer[] =
    await ArrayUtil.asyncMap(top5, async (data) => {
      const { employee, total_minutes } = data;
      // Get member summary (via user_id)
      const member = await MyGlobal.prisma.hrm_platform_members.findUnique({
        where: { id: employee.hrm_platform_user_id },
        select: {
          id: true,
          email: true,
          display_name: true,
          avatar_image: true,
          phone_number: true,
        },
      });
      // Get role summary
      let roleSummary: IHrmPlatformRole.ISummary | null = null;
      if (employee.hrm_platform_role_id) {
        const role = await MyGlobal.prisma.hrm_platform_roles.findUnique({
          where: { id: employee.hrm_platform_role_id },
          select: {
            id: true,
            code: true,
            name: true,
            description: true,
            is_builtin: true,
            created_at: true,
            deleted_at: true,
          },
        });
        if (role) {
          const rolePermissions =
            await MyGlobal.prisma.hrm_platform_role_permissions.findMany({
              where: { hrm_platform_role_id: role.id },
              select: { hrm_platform_permission_id: true },
            });
          const permissions = await ArrayUtil.asyncMap(
            rolePermissions,
            async (rp) => {
              const perm =
                await MyGlobal.prisma.hrm_platform_permissions.findUnique({
                  where: { id: rp.hrm_platform_permission_id },
                  select: { code: true },
                });
              return perm?.code ?? "";
            },
          );
          roleSummary = {
            id: role.id as string & tags.Format<"uuid">,
            code: role.code,
            name: role.name,
            description: role.description ?? undefined,
            is_builtin: role.is_builtin,
            permissions,
            created_at: role.created_at.toISOString(),
            deleted_at: role.deleted_at?.toISOString() ?? null,
          } satisfies IHrmPlatformRole.ISummary;
        }
      }
      // Get department summary with parent
      let departmentSummary: IHrmPlatformDepartment.ISummary | null = null;
      if (employee.hrm_platform_department_id) {
        const department =
          await MyGlobal.prisma.hrm_platform_departments.findUnique({
            where: { id: employee.hrm_platform_department_id },
            select: {
              id: true,
              name: true,
              description: true,
              parent_department_id: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          });
        if (department) {
          let parentDepartmentSummary: IHrmPlatformDepartment.ISummary | null =
            null;
          if (department.parent_department_id) {
            const parentDepartment =
              await MyGlobal.prisma.hrm_platform_departments.findUnique({
                where: { id: department.parent_department_id },
                select: {
                  id: true,
                  name: true,
                  description: true,
                  parent_department_id: true,
                  created_at: true,
                  updated_at: true,
                  deleted_at: true,
                },
              });
            if (parentDepartment) {
              parentDepartmentSummary = {
                id: parentDepartment.id as string & tags.Format<"uuid">,
                name: parentDepartment.name,
                description: parentDepartment.description ?? undefined,
                parent_department: null,
                created_at: parentDepartment.created_at.toISOString(),
                updated_at: parentDepartment.updated_at.toISOString(),
                deleted_at: parentDepartment.deleted_at?.toISOString() ?? null,
              } satisfies IHrmPlatformDepartment.ISummary;
            }
          }
          departmentSummary = {
            id: department.id as string & tags.Format<"uuid">,
            name: department.name,
            description: department.description ?? undefined,
            parent_department: parentDepartmentSummary,
            created_at: department.created_at.toISOString(),
            updated_at: department.updated_at.toISOString(),
            deleted_at: department.deleted_at?.toISOString() ?? null,
          } satisfies IHrmPlatformDepartment.ISummary;
        }
      }
      const employeeSummary: IHrmPlatformEmployee.ISummary = {
        id: employee.id as string & tags.Format<"uuid">,
        position: employee.position,
        employment_type: employee.employment_type,
        status: employee.status,
        user: {
          id: member?.id as string & tags.Format<"uuid">,
          email: member?.email ?? "",
          display_name: member?.display_name ?? "",
          avatar_image: member?.avatar_image ?? undefined,
          phone_number: member?.phone_number ?? undefined,
        } satisfies IHrmPlatformMember.ISummary,
        role: roleSummary ?? {
          id: "00000000-0000-0000-0000-000000000000" as string &
            tags.Format<"uuid">,
          code: "",
          name: "",
          is_builtin: false,
          permissions: [],
          created_at: new Date().toISOString(),
          deleted_at: null,
        },
        department: departmentSummary,
        created_at: new Date().toISOString(),
      } satisfies IHrmPlatformEmployee.ISummary;
      return {
        employee: employeeSummary,
        total_hours: total_minutes / 60,
      } satisfies IOrganizationDashboard.ITopPerformer;
    });
  return {
    active_employee_count: activeEmployeeCount,
    weekly_hours_total: weeklyHoursTotal,
    pending_timesheet_count: pendingTimesheetCount,
    budget_alerts: budgetAlerts,
    top_performers: topPerformers,
  } satisfies IOrganizationDashboard;
}
