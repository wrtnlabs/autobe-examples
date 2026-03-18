import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
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

export async function getHrmsMemberOrganizationDashboard(props: {
  member: MemberPayload;
}): Promise<IHrmsOrganization> {
  const session = await MyGlobal.prisma.hrms_member_sessions.findFirst({
    where: {
      hrms_member_id: props.member.id,
      id: props.member.session_id,
      expired_at: { gt: new Date() },
    },
  });
  if (session === null) {
    throw new HttpException("Unauthorized", 401);
  }
  const organizationId = session.current_organization_id;
  if (organizationId === null) {
    throw new HttpException("Forbidden", 403);
  }
  const organizationMember =
    await MyGlobal.prisma.hrms_organization_members.findUnique({
      where: {
        hrms_organization_id_hrms_member_id: {
          hrms_organization_id: organizationId,
          hrms_member_id: props.member.id,
        },
      },
      include: {
        organizationRole: {
          include: {
            permissions: true,
          },
        },
      },
    });
  if (organizationMember === null) {
    throw new HttpException("Forbidden", 403);
  }
  const hasReportPermission =
    organizationMember.organizationRole.permissions.some(
      (permission) => permission.permission === "report:view",
    );
  if (!hasReportPermission) {
    throw new HttpException("Forbidden", 403);
  }
  const organization = await MyGlobal.prisma.hrms_organizations.findUnique({
    where: { id: organizationId },
    select: { name: true },
  });
  const activeEmployees = await MyGlobal.prisma.hrms_employees.findMany({
    where: {
      organization_member_id: organizationMember.id,
      status: "active",
    },
  });
  const totalActiveEmployees = activeEmployees.length;
  const employeeIds = activeEmployees.map((e) => e.id);
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + mondayOffset,
      0,
      0,
      0,
      0,
    ),
  );
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
  weekEnd.setUTCHours(23, 59, 59, 999);
  const timelogsThisWeek = await MyGlobal.prisma.hrms_timelogs.findMany({
    where: {
      employee_id: {
        in: employeeIds,
      },
      date: {
        gte: weekStart,
        lte: weekEnd,
      },
    },
    select: {
      id: true,
      employee_id: true,
      project_id: true,
      duration_minutes: true,
    },
  });
  const totalMinutes = timelogsThisWeek.reduce(
    (sum, log) => sum + log.duration_minutes,
    0,
  );
  const totalHoursThisWeek = totalMinutes / 60;
  const pendingTimesheetsCount = await MyGlobal.prisma.hrms_timesheets.count({
    where: {
      hrms_employee_id: {
        in: employeeIds,
      },
      status: "submitted",
    },
  });
  const projectsWithBudget = await MyGlobal.prisma.hrms_projects.findMany({
    where: {
      hrms_organization_id: organizationId,
      budget_hours: {
        not: null,
        gt: 0,
      },
    },
    select: {
      id: true,
      name: true,
      description: true,
      color_code: true,
      budget_hours: true,
      status: true,
    },
  });
  const projectTimelogs = await MyGlobal.prisma.hrms_timelogs.findMany({
    where: {
      project_id: {
        in: projectsWithBudget.map((p) => p.id),
      },
    },
    select: {
      project_id: true,
      duration_minutes: true,
    },
  });
  const projectAggregates = new Map<string, number>();
  for (const log of projectTimelogs) {
    const existing = projectAggregates.get(log.project_id) ?? 0;
    projectAggregates.set(log.project_id, existing + log.duration_minutes);
  }
  const projectsOverBudget: IHrmsProject.ISummary[] = projectsWithBudget
    .map((project) => {
      const loggedMinutes = projectAggregates.get(project.id) ?? 0;
      const loggedHours = loggedMinutes / 60;
      const budgetHours = project.budget_hours ?? 0;
      const utilization =
        budgetHours > 0 ? (loggedHours / budgetHours) * 100 : 0;
      if (utilization <= 80) {
        return null;
      }
      return {
        id: project.id,
        name: project.name,
        description: project.description ?? "",
        color_code: project.color_code,
        organization_id: organizationId,
        organization_name: organization?.name ?? "",
        status: project.status as "active" | "archived" | "completed",
        budget_hours: project.budget_hours,
        start_date: null,
        end_date: null,
        planned_hours: budgetHours,
        actual_hours: loggedHours,
        budget_utilization_percentage: utilization,
        total_tasks: 0,
        pending_tasks: 0,
        in_progress_tasks: 0,
        completed_tasks: 0,
        closed_tasks: 0,
        timelog_count: 0,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      } satisfies IHrmsProject.ISummary;
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);
  const topEmployeeTimelogs = timelogsThisWeek;
  const employeeHours = new Map<string, number>();
  for (const log of topEmployeeTimelogs) {
    const existing = employeeHours.get(log.employee_id) ?? 0;
    employeeHours.set(log.employee_id, existing + log.duration_minutes);
  }
  const topEmployeesData = Array.from(employeeHours.entries())
    .map(([employeeId, minutes]) => ({
      employee_id: employeeId,
      hours: minutes / 60,
    }))
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 5);
  const topEmployees: IHrmsEmployee.ISummary[] = (
    await Promise.all(
      topEmployeesData.map(async (data) => {
        const employee = await MyGlobal.prisma.hrms_employees.findUnique({
          where: { id: data.employee_id },
          select: {
            id: true,
            display_name: true,
            position: true,
            department_id: true,
            status: true,
          },
        });
        if (employee === null || employee.department_id === null) {
          return null;
        }
        return {
          id: employee.id,
          display_name: employee.display_name,
          position: employee.position ?? undefined,
          department_id: employee.department_id,
          total_hours_logged: data.hours,
          timelog_count: 0,
          timesheets_submitted: 0,
          timesheets_approved: 0,
          timesheets_pending: 0,
          status: employee.status as "active" | "completed" | "archived",
        } satisfies IHrmsEmployee.ISummary;
      }),
    )
  ).filter((e): e is NonNullable<typeof e> => e !== null);
  return {
    totalActiveEmployees: totalActiveEmployees,
    totalHoursThisWeek: totalHoursThisWeek,
    pendingTimesheetsCount: pendingTimesheetsCount,
    projectsOverBudget: projectsOverBudget,
    topEmployees: topEmployees,
    generatedAt: toISOStringSafe(new Date()),
  } satisfies IHrmsOrganization;
}
