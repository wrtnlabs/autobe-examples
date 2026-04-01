import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import { IHrmsTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimer";
import { IHrmsTopEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTopEmployee";
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

export async function getHrmsMemberDashboard(props: {
  member: MemberPayload;
}): Promise<IHrmsProject> {
  const organizationMember =
    await MyGlobal.prisma.hrms_organization_members.findFirst({
      where: {
        hrms_member_id: props.member.id,
        deleted_at: null,
      },
      include: {
        organizationRole: {
          include: { permissions: true },
        },
      },
    });
  if (!organizationMember) {
    throw new HttpException("Member not found in organization", 404);
  }
  const hasReportView = organizationMember.organizationRole.permissions.some(
    (p) => p.permission === "report:view",
  );
  const employee = await MyGlobal.prisma.hrms_employees.findFirst({
    where: {
      organization_member_id: organizationMember.id,
      deleted_at: null,
    },
  });
  if (!employee) {
    throw new HttpException("Employee record not found", 404);
  }
  const kstOffset = 9 * 60 * 60 * 1000;
  const now = new Date();
  const kstDate = new Date(now.getTime() + kstOffset);
  const dayOfWeek = kstDate.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(kstDate);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  const startOfDay = new Date(kstDate);
  startOfDay.setHours(0, 0, 0, 0);
  let hoursToday: number | null | undefined;
  let hoursThisWeek: number | null | undefined;
  let activeTimer: IHrmsTimer | null | undefined;
  let recentTimelogs: IHrmsTimelog.ISummary[] | undefined;
  let pendingTimesheetsCount: number | null | undefined;
  let assignedTasks: IHrmsTask.ISummary[] | undefined;
  let totalActiveEmployeeCount: number | null | undefined;
  let totalHoursThisWeek: number | null | undefined;
  let organizationPendingTimesheetsCount: number | null | undefined;
  let budgetAlerts: IHrmsProject.ISummary[] | undefined;
  let topEmployees: IHrmsTopEmployee.ISummary[] | undefined;
  if (!hasReportView) {
    const todayTimelogs = await MyGlobal.prisma.hrms_timelogs.findMany({
      where: {
        employee_id: employee.id,
        date: {
          gte: startOfDay,
          lte: new Date(startOfDay.getTime() + 86400000 - 1),
        },
        deleted_at: null,
      },
    });
    hoursToday =
      todayTimelogs.reduce((sum, t) => sum + t.duration_minutes, 0) / 60;
    const weekTimelogs = await MyGlobal.prisma.hrms_timelogs.findMany({
      where: {
        employee_id: employee.id,
        date: { gte: monday, lte: sunday },
        deleted_at: null,
      },
    });
    hoursThisWeek =
      weekTimelogs.reduce((sum, t) => sum + t.duration_minutes, 0) / 60;
    const timer = await MyGlobal.prisma.hrms_timers.findFirst({
      where: { hrms_employee_id: employee.id, deleted_at: null },
      include: {
        employee: {
          select: {
            id: true,
            display_name: true,
            position: true,
            department_id: true,
            status: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            description: true,
            color_code: true,
            hrms_organization_id: true,
            status: true,
            budget_hours: true,
            start_date: true,
            end_date: true,
            created_at: true,
            updated_at: true,
          },
          include: { organization: { select: { name: true } } },
        },
        task: { select: { id: true } },
      },
    });
    if (timer) {
      activeTimer = typia.assert<IHrmsTimer>({
        id: timer.id,
        employee: typia.assert<IHrmsEmployee.ISummary>({
          id: timer.employee.id,
          display_name: timer.employee.display_name,
          position: timer.employee.position ?? undefined,
          department_id: timer.employee.department_id ?? "",
          status: timer.employee.status,
          total_hours_logged: 0,
          timelog_count: 0,
          timesheets_submitted: 0,
          timesheets_approved: 0,
          timesheets_pending: 0,
        }),
        project: typia.assert<IHrmsProject.ISummary>({
          id: timer.project.id,
          name: timer.project.name,
          description: timer.project.description ?? "",
          color_code: timer.project.color_code,
          organization_id: timer.project.hrms_organization_id,
          organization_name: timer.project.organization.name,
          status: timer.project.status as IHrmsProject.ISummary["status"],
          budget_hours: timer.project.budget_hours ?? 0,
          start_date: timer.project.start_date
            ? toISOStringSafe(timer.project.start_date)
            : null,
          end_date: timer.project.end_date
            ? toISOStringSafe(timer.project.end_date)
            : null,
          total_tasks: 0,
          pending_tasks: 0,
          in_progress_tasks: 0,
          completed_tasks: 0,
          closed_tasks: 0,
          planned_hours: timer.project.budget_hours ?? 0,
          actual_hours: 0,
          budget_utilization_percentage: null,
          timelog_count: 0,
          created_at: toISOStringSafe(timer.project.created_at),
          updated_at: toISOStringSafe(timer.project.updated_at),
        }),
        task: null,
        start_at: toISOStringSafe(timer.start_at),
        description: timer.description ?? undefined,
        created_at: toISOStringSafe(timer.created_at),
        updated_at: toISOStringSafe(timer.updated_at),
        deleted_at: timer.deleted_at ? toISOStringSafe(timer.deleted_at) : null,
      });
    }
    const recentTimelogsResult = await MyGlobal.prisma.hrms_timelogs.findMany({
      where: { employee_id: employee.id, deleted_at: null },
      orderBy: { created_at: "desc" },
      take: 5,
    });
    recentTimelogs = recentTimelogsResult.map((t) => ({
      group_id: t.id,
      group_name: "Personal",
      total_hours: t.duration_minutes / 60,
      billable_hours: t.billable ? t.duration_minutes / 60 : 0,
      non_billable_hours: !t.billable ? t.duration_minutes / 60 : 0,
    }));
    const pendingTimesheets = await MyGlobal.prisma.hrms_timesheets.findMany({
      where: {
        hrms_employee_id: employee.id,
        status: "submitted",
        week_start_date: { gte: monday, lte: sunday },
      },
    });
    pendingTimesheetsCount = pendingTimesheets.length;
    const assignedTasksResult = await MyGlobal.prisma.hrms_tasks.findMany({
      where: {
        hrms_employee_id: employee.id,
        status: { in: ["open", "in-progress"] },
        deleted_at: null,
      },
      include: { project: { select: { id: true, name: true } } },
    });
    assignedTasks = assignedTasksResult.map((t) => ({
      project_id: t.project.id,
      project_name: t.project.name,
      task_count: 0,
    })) as IHrmsTask.ISummary[];
  }
  if (hasReportView) {
    const activeEmployees = await MyGlobal.prisma.hrms_employees.findMany({
      where: {
        organization_member_id: organizationMember.hrms_organization_id,
        status: "active",
        deleted_at: null,
      },
    });
    totalActiveEmployeeCount = activeEmployees.length;
    const allTimelogs = await MyGlobal.prisma.hrms_timelogs.findMany({
      where: {
        employee: {
          organization_member_id: organizationMember.hrms_organization_id,
          status: "active",
          deleted_at: null,
        },
        date: { gte: monday, lte: sunday },
        deleted_at: null,
      },
    });
    totalHoursThisWeek =
      allTimelogs.reduce((sum, t) => sum + t.duration_minutes, 0) / 60;
    const orgPendingTimesheets = await MyGlobal.prisma.hrms_timesheets.findMany(
      {
        where: {
          employee: {
            organization_member_id: organizationMember.hrms_organization_id,
          },
          status: "submitted",
          week_start_date: { gte: monday, lte: sunday },
        },
      },
    );
    organizationPendingTimesheetsCount = orgPendingTimesheets.length;
    const projects = await MyGlobal.prisma.hrms_projects.findMany({
      where: {
        hrms_organization_id: organizationMember.hrms_organization_id,
        status: "active",
        budget_hours: { not: null },
      },
    });
    const alerts = await Promise.all(
      projects.map(async (project) => {
        const projectTimelogs = await MyGlobal.prisma.hrms_timelogs.findMany({
          where: { project_id: project.id, deleted_at: null },
        });
        const actualHours =
          projectTimelogs.reduce((sum, t) => sum + t.duration_minutes, 0) / 60;
        const budgetHours = project.budget_hours ?? 0;
        const utilization =
          budgetHours > 0 ? (actualHours / budgetHours) * 100 : 0;
        if (utilization > 80) {
          const alert = {
            id: project.id,
            name: project.name,
            description: project.description ?? "",
            color_code: project.color_code,
            organization_id: project.hrms_organization_id,
            organization_name: organizationMember.organizationRole.name,
            status: project.status as IHrmsProject.ISummary["status"],
            budget_hours: project.budget_hours ?? 0,
            start_date: project.start_date
              ? toISOStringSafe(project.start_date)
              : null,
            end_date: project.end_date
              ? toISOStringSafe(project.end_date)
              : null,
            planned_hours: budgetHours,
            actual_hours: actualHours,
            budget_utilization_percentage: utilization,
            total_tasks: 0,
            pending_tasks: 0,
            in_progress_tasks: 0,
            completed_tasks: 0,
            closed_tasks: 0,
            timelog_count: projectTimelogs.length,
            created_at: toISOStringSafe(project.created_at),
            updated_at: toISOStringSafe(project.updated_at),
          };
          return typia.assert<IHrmsProject.ISummary>(alert);
        }
        return null;
      }),
    );
    budgetAlerts = alerts.filter((b): b is IHrmsProject.ISummary => b !== null);
    const employeeHours = await MyGlobal.prisma.hrms_timelogs.groupBy({
      by: ["employee_id"],
      where: {
        employee: {
          organization_member_id: organizationMember.hrms_organization_id,
          status: "active",
          deleted_at: null,
        },
        date: { gte: monday, lte: sunday },
        deleted_at: null,
      },
      _sum: { duration_minutes: true },
      orderBy: { _sum: { duration_minutes: "desc" } },
      take: 5,
    });
    topEmployees = (
      await Promise.all(
        employeeHours.map(async (e) => {
          const emp = await MyGlobal.prisma.hrms_employees.findUnique({
            where: { id: e.employee_id },
          });
          if (!emp) return null;
          const empTimelogs = await MyGlobal.prisma.hrms_timelogs.findMany({
            where: {
              employee_id: e.employee_id,
              date: { gte: monday, lte: sunday },
              deleted_at: null,
            },
          });
          const projectIds = [...new Set(empTimelogs.map((t) => t.project_id))];
          const taskIds = [
            ...new Set(
              empTimelogs
                .map((t) => t.task_id)
                .filter((t): t is string => t !== null),
            ),
          ];
          const topEmp = {
            id: emp.id,
            display_name: emp.display_name,
            position: emp.position ?? "",
            department_id: emp.department_id ?? null,
            total_hours: e._sum.duration_minutes ?? 0,
            billable_hours: empTimelogs
              .filter((t) => t.billable)
              .reduce((sum, t) => sum + t.duration_minutes, 0),
            project_count: projectIds.length,
            task_count: taskIds.length,
          };
          return typia.assert<IHrmsTopEmployee.ISummary>(topEmp);
        }),
      )
    ).filter((t): t is IHrmsTopEmployee.ISummary => t !== null);
  }
  return {
    dashboard_type: hasReportView ? "organization" : "personal",
    generation_timestamp: toISOStringSafe(kstDate),
    hours_today: hoursToday,
    hours_this_week: hoursThisWeek,
    active_timer: activeTimer,
    recent_timelogs: recentTimelogs,
    pending_timesheets_count: pendingTimesheetsCount,
    assigned_tasks: assignedTasks,
    active_employee_count: totalActiveEmployeeCount,
    total_hours_this_week: totalHoursThisWeek,
    budget_alerts: budgetAlerts,
    top_employees: topEmployees,
  } satisfies IHrmsProject;
}
