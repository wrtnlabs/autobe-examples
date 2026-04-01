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
      id: props.member.session_id,
    },
  });
  if (session === null) {
    throw new HttpException("Session expired", 403);
  }
  const organizationMember =
    await MyGlobal.prisma.hrms_organization_members.findFirst({
      where: {
        hrms_member_id: props.member.id,
        deleted_at: null,
      },
    });
  if (organizationMember === null) {
    throw new HttpException("No organization selected", 403);
  }
  const rolePermission =
    await MyGlobal.prisma.hrms_organization_role_permissions.findFirst({
      where: {
        hrms_organization_role_id: organizationMember.hrms_organization_role_id,
        permission: "report:view",
      },
    });
  if (rolePermission === null) {
    throw new HttpException("Forbidden", 403);
  }
  const organization = await MyGlobal.prisma.hrms_organizations.findUnique({
    where: {
      id: organizationMember.hrms_organization_id,
    },
  });
  const activeEmployees = await MyGlobal.prisma.hrms_employees.findMany({
    where: {
      organization_member_id: organizationMember.id,
      status: "active",
      deleted_at: null,
    },
    include: {
      department: true,
    },
  });
  const totalActiveEmployees = activeEmployees.length;
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const monday = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1),
    ),
  );
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  const timelogs = await MyGlobal.prisma.hrms_timelogs.findMany({
    where: {
      employee_id: {
        in: activeEmployees.map((e) => e.id),
      },
      date: {
        gte: monday,
        lt: new Date(sunday.getTime() + 86400000),
      },
      deleted_at: null,
    },
  });
  const totalHoursThisWeek = timelogs.reduce(
    (sum, log) => sum + log.duration_minutes / 60,
    0,
  );
  const pendingTimesheets = await MyGlobal.prisma.hrms_timesheets.findMany({
    where: {
      hrms_employee_id: {
        in: activeEmployees.map((e) => e.id),
      },
      status: "submitted",
      deleted_at: null,
    },
  });
  const pendingTimesheetsCount = pendingTimesheets.length;
  const projects = await MyGlobal.prisma.hrms_projects.findMany({
    where: {
      hrms_organization_id: organizationMember.hrms_organization_id,
      deleted_at: null,
      budget_hours: {
        not: null,
        gt: 0,
      },
    },
    include: {
      timelogs: {
        where: {
          date: {
            gte: monday,
            lt: new Date(sunday.getTime() + 86400000),
          },
        },
      },
      tasks: true,
    },
  });
  const projectsOverBudget: IHrmsProject.ISummary[] = projects
    .map((project) => {
      const loggedHours = project.timelogs.reduce(
        (sum, log) => sum + log.duration_minutes / 60,
        0,
      );
      const utilization = (loggedHours / project.budget_hours!) * 100;
      return {
        id: project.id,
        name: project.name,
        description: project.description ?? "",
        color_code: project.color_code,
        organization_id: project.hrms_organization_id,
        organization_name: organization?.name ?? "",
        status: project.status as "active" | "completed" | "archived",
        budget_hours: project.budget_hours,
        start_date: toISOStringSafe(project.start_date ?? new Date()),
        end_date: toISOStringSafe(project.end_date ?? new Date()),
        planned_hours: project.budget_hours ?? 0,
        actual_hours: loggedHours,
        budget_utilization_percentage: utilization > 80 ? utilization : null,
        total_tasks: project.tasks.length,
        pending_tasks: project.tasks.filter(
          (t) => t.status === "open" || t.status === "pending",
        ).length,
        in_progress_tasks: project.tasks.filter(
          (t) => t.status === "in-progress",
        ).length,
        completed_tasks: project.tasks.filter((t) => t.status === "completed")
          .length,
        closed_tasks: project.tasks.filter((t) => t.status === "closed").length,
        timelog_count: project.timelogs.length,
        created_at: toISOStringSafe(project.created_at ?? new Date()),
        updated_at: toISOStringSafe(project.updated_at ?? new Date()),
      } satisfies IHrmsProject.ISummary;
    })
    .filter(
      (project) =>
        project.budget_utilization_percentage !== null &&
        project.budget_utilization_percentage > 80,
    );
  const employeeHours = activeEmployees.map((employee) => {
    const employeeTimelogs = timelogs.filter(
      (log) => log.employee_id === employee.id,
    );
    const totalHours = employeeTimelogs.reduce(
      (sum, log) => sum + log.duration_minutes / 60,
      0,
    );
    return {
      employee,
      totalHours,
    };
  });
  const sortedEmployees = employeeHours.sort(
    (a, b) => b.totalHours - a.totalHours,
  );
  const topEmployeesData = sortedEmployees.slice(0, 5);
  const topEmployees: IHrmsEmployee.ISummary[] = topEmployeesData.map(
    (item) => {
      const employee = item.employee;
      const employeeTimelogs = timelogs.filter(
        (log) => log.employee_id === employee.id,
      );
      const totalHoursLogged = employeeTimelogs.reduce(
        (sum, log) => sum + log.duration_minutes / 60,
        0,
      );
      const employeeTimesheets = pendingTimesheets.filter(
        (ts) => ts.hrms_employee_id === employee.id,
      );
      return {
        id: employee.id,
        display_name: employee.display_name,
        position: employee.position ?? undefined,
        department_id: (employee.department?.id ?? "") as string &
          tags.Format<"uuid">,
        total_hours_logged: totalHoursLogged,
        timelog_count: employeeTimelogs.length,
        timesheets_submitted: employeeTimesheets.length,
        timesheets_approved: 0,
        timesheets_pending: 0,
        status: employee.status as "active" | "archived" | "suspended" | "left",
      } satisfies IHrmsEmployee.ISummary;
    },
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
