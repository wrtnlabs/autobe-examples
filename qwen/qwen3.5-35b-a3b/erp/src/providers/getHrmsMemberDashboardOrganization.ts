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

export async function getHrmsMemberDashboardOrganization(props: {
  member: MemberPayload;
}): Promise<IHrmsOrganization> {
  const session = await MyGlobal.prisma.hrms_member_sessions.findFirst({
    where: {
      id: props.member.session_id,
    },
    select: {
      current_organization_id: true,
    },
  });
  if (session === null) {
    throw new HttpException("Session expired", 403);
  }
  const selectedOrgId = session.current_organization_id as string;
  const selectedOrganization =
    await MyGlobal.prisma.hrms_organizations.findUnique({
      where: { id: selectedOrgId, deleted_at: null },
    });
  if (selectedOrganization === null) {
    throw new HttpException("Organization not found", 404);
  }
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + mondayOffset,
  );
  weekStart.setUTCHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
  weekEnd.setUTCHours(23, 59, 59, 999);
  const activeEmployees = await MyGlobal.prisma.hrms_employees.findMany({
    where: {
      deleted_at: null,
      status: "active",
      organizationMember: {
        hrms_organization_id: selectedOrgId as string,
      },
    },
    select: { id: true },
  });
  const activeEmployeeIds = activeEmployees.map((e) => e.id);
  const totalActiveEmployees = activeEmployeeIds.length;
  const weeklyTimelogs = await MyGlobal.prisma.hrms_timelogs.findMany({
    where: {
      deleted_at: null,
      employee_id: {
        in: activeEmployeeIds,
      },
      date: {
        gte: weekStart,
        lte: weekEnd,
      },
    },
    select: { duration_minutes: true },
  });
  const totalMinutes = weeklyTimelogs.reduce(
    (sum, tl) => sum + tl.duration_minutes,
    0,
  );
  const totalHoursThisWeek = Math.round((totalMinutes / 60) * 100) / 100;
  const pendingTimesheets = await MyGlobal.prisma.hrms_timesheets.findMany({
    where: {
      deleted_at: null,
      status: "submitted",
      hrms_employee_id: {
        in: activeEmployeeIds,
      },
    },
    select: { id: true },
  });
  const pendingTimesheetsCount = pendingTimesheets.length;
  const activeProjects = await MyGlobal.prisma.hrms_projects.findMany({
    where: {
      deleted_at: null,
      hrms_organization_id: selectedOrgId as string,
      status: {
        in: ["active", "archived"],
      },
      budget_hours: {
        gt: 0,
      },
    },
    select: {
      id: true,
      name: true,
      budget_hours: true,
    },
  });
  const projectsOverBudget: IHrmsProject.ISummary[] = [];
  for (const project of activeProjects) {
    const projectTimelogs = await MyGlobal.prisma.hrms_timelogs.findMany({
      where: {
        deleted_at: null,
        project_id: project.id,
        employee_id: {
          in: activeEmployeeIds,
        },
        date: {
          gte: weekStart,
          lte: weekEnd,
        },
      },
      select: { duration_minutes: true },
    });
    const projectMinutes = projectTimelogs.reduce(
      (sum, tl) => sum + tl.duration_minutes,
      0,
    );
    const projectHours = projectMinutes / 60;
    const utilizationPercentage = (projectHours / project.budget_hours!) * 100;
    if (utilizationPercentage > 80) {
      projectsOverBudget.push({
        id: project.id,
        name: project.name,
        description: "",
        color_code: "#000000",
        organization_id: selectedOrgId as string,
        organization_name: selectedOrganization.name,
        status: "active",
        budget_hours: project.budget_hours,
        start_date: null,
        end_date: null,
        planned_hours: project.budget_hours ?? 0,
        actual_hours: projectHours,
        budget_utilization_percentage: utilizationPercentage,
        total_tasks: 0,
        pending_tasks: 0,
        in_progress_tasks: 0,
        completed_tasks: 0,
        closed_tasks: 0,
        timelog_count: projectTimelogs.length,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      } satisfies IHrmsProject.ISummary);
    }
  }
  const employeeWeeklyHours = await MyGlobal.prisma.hrms_timelogs.groupBy({
    by: ["employee_id"],
    where: {
      employee_id: {
        in: activeEmployeeIds,
      },
      date: {
        gte: weekStart,
        lte: weekEnd,
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
  const employeeIdsInTop5 = employeeWeeklyHours.map((e) => e.employee_id);
  const topEmployeesData = await MyGlobal.prisma.hrms_employees.findMany({
    where: {
      id: {
        in: employeeIdsInTop5,
      },
      deleted_at: null,
    },
    select: {
      id: true,
      display_name: true,
      position: true,
      department_id: true,
    },
  });
  const employeeHoursMap = new Map(
    employeeWeeklyHours.map((e) => [
      e.employee_id,
      Math.round(((e._sum.duration_minutes ?? 0) / 60) * 100) / 100,
    ]),
  );
  const topEmployees: IHrmsEmployee.ISummary[] = topEmployeesData.map(
    (emp) =>
      ({
        id: emp.id,
        display_name: emp.display_name,
        position: emp.position ?? "",
        department_id: emp.department_id ?? "",
        total_hours_logged: 0,
        timelog_count: 0,
        timesheets_submitted: 0,
        timesheets_approved: 0,
        timesheets_pending: 0,
        status: "active",
      }) satisfies IHrmsEmployee.ISummary,
  );
  return {
    totalActiveEmployees,
    totalHoursThisWeek,
    pendingTimesheetsCount,
    projectsOverBudget,
    topEmployees,
    generatedAt: toISOStringSafe(new Date()),
  } satisfies IHrmsOrganization;
}
