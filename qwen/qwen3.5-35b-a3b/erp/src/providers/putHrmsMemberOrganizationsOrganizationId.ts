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

export async function putHrmsMemberOrganizationsOrganizationId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IHrmsOrganization.IUpdate;
}): Promise<IHrmsOrganization> {
  const organization =
    await MyGlobal.prisma.hrms_organizations.findUniqueOrThrow({
      where: { id: props.organizationId },
      select: { id: true, name: true, owner_id: true },
    });
  const membership =
    await MyGlobal.prisma.hrms_organization_members.findFirstOrThrow({
      where: {
        hrms_member_id: props.member.id,
        hrms_organization_id: props.organizationId,
        deleted_at: null,
      },
      include: { organizationRole: true },
    });
  if (
    membership.organizationRole.name !== "Owner" &&
    membership.organizationRole.name !== "Manager"
  ) {
    throw new HttpException("Forbidden", 403);
  }
  if (props.body.name !== undefined && props.body.name !== organization.name) {
    const existing = await MyGlobal.prisma.hrms_organizations.findUnique({
      where: { name: props.body.name },
    });
    if (existing !== null && existing.id !== props.organizationId) {
      throw new HttpException("Organization name already exists", 409);
    }
  }
  const updateData: Prisma.hrms_organizationsUpdateInput = {
    ...(props.body.name !== undefined && { name: props.body.name }),
    ...(props.body.description !== undefined && {
      description: props.body.description,
    }),
    ...(props.body.logo_uri !== undefined && { logo_uri: props.body.logo_uri }),
    ...(props.body.currency !== undefined && { currency: props.body.currency }),
    ...(props.body.timezone !== undefined && { timezone: props.body.timezone }),
    ...(props.body.fiscal_start_month !== undefined && {
      fiscal_start_month: props.body.fiscal_start_month,
    }),
    updated_at: toISOStringSafe(new Date()),
  };
  await MyGlobal.prisma.hrms_organizations.update({
    where: { id: props.organizationId },
    data: updateData,
  });
  const currentWeekStart = new Date();
  currentWeekStart.setDate(
    currentWeekStart.getDate() - currentWeekStart.getDay(),
  );
  currentWeekStart.setHours(0, 0, 0, 0);
  const currentWeekEnd = new Date(currentWeekStart);
  currentWeekEnd.setDate(currentWeekEnd.getDate() + 6);
  currentWeekEnd.setHours(23, 59, 59, 999);
  const activeEmployeesCount = await MyGlobal.prisma.hrms_employees.count({
    where: {
      organizationMember: {
        organization: { id: props.organizationId },
      },
      status: "active",
      deleted_at: null,
    },
  });
  const totalHoursThisWeek = await MyGlobal.prisma.hrms_timelogs.aggregate({
    where: {
      deleted_at: null,
      created_at: {
        gte: currentWeekStart,
        lte: currentWeekEnd,
      },
      employee: {
        organizationMember: {
          organization: { id: props.organizationId },
        },
        status: "active",
      },
    },
    _sum: { duration_minutes: true },
  });
  const pendingTimesheetsCount = await MyGlobal.prisma.hrms_timesheets.count({
    where: {
      employee: {
        organizationMember: {
          organization: { id: props.organizationId },
        },
        status: "active",
      },
      status: "submitted",
      deleted_at: null,
    },
  });
  const projectsOverBudget = await MyGlobal.prisma.hrms_projects
    .findMany({
      where: {
        hrms_organization_id: props.organizationId,
        budget_hours: { gt: 0 },
      },
    })
    .then(async (projects) => {
      const overBudgetProjects: IHrmsProject.ISummary[] = [];
      for (const project of projects) {
        const hoursLogged = await MyGlobal.prisma.hrms_timelogs.aggregate({
          where: {
            project_id: project.id,
            deleted_at: null,
          },
          _sum: { duration_minutes: true },
        });
        const loggedHours = hoursLogged._sum.duration_minutes ?? 0;
        if (project.budget_hours === null || project.budget_hours === 0) {
          continue;
        }
        const utilization = loggedHours / 60 / project.budget_hours;
        if (utilization > 0.8) {
          const org = await MyGlobal.prisma.hrms_organizations.findUnique({
            where: { id: project.hrms_organization_id },
            select: { name: true },
          });
          overBudgetProjects.push({
            id: project.id,
            name: project.name,
            description: project.description ?? "",
            color_code: project.color_code,
            organization_id: project.hrms_organization_id,
            organization_name: org?.name ?? "",
            status: project.status as "active" | "archived" | "completed",
            budget_hours: project.budget_hours,
            start_date: project.start_date?.toISOString() ?? null,
            end_date: project.end_date?.toISOString() ?? null,
            planned_hours: project.budget_hours,
            actual_hours: loggedHours / 60,
            budget_utilization_percentage: utilization * 100,
            total_tasks: 0,
            pending_tasks: 0,
            in_progress_tasks: 0,
            completed_tasks: 0,
            closed_tasks: 0,
            timelog_count: 0,
            created_at: project.created_at.toISOString(),
            updated_at: project.updated_at.toISOString(),
          });
        }
      }
      return overBudgetProjects;
    });
  const topEmployees = await MyGlobal.prisma.hrms_employees
    .findMany({
      where: {
        organizationMember: {
          organization: { id: props.organizationId },
        },
        status: "active",
        deleted_at: null,
      },
      orderBy: {
        id: "desc",
      },
      take: 5,
    })
    .then(async (employees) => {
      const topEmployees: IHrmsEmployee.ISummary[] = [];
      for (const employee of employees) {
        const hoursLogged = await MyGlobal.prisma.hrms_timelogs.aggregate({
          where: {
            employee_id: employee.id,
            deleted_at: null,
            created_at: {
              gte: currentWeekStart,
              lte: currentWeekEnd,
            },
          },
          _sum: { duration_minutes: true },
        });
        topEmployees.push({
          id: employee.id,
          display_name: employee.display_name,
          position: employee.position ?? undefined,
          department_id:
            employee.department_id !== null
              ? (employee.department_id as string & tags.Format<"uuid">)
              : props.organizationId,
          total_hours_logged: hoursLogged._sum.duration_minutes ?? 0,
          timelog_count: 0,
          timesheets_submitted: 0,
          timesheets_approved: 0,
          timesheets_pending: 0,
          status: employee.status,
        });
      }
      return topEmployees;
    });
  return {
    totalActiveEmployees: activeEmployeesCount,
    totalHoursThisWeek: (totalHoursThisWeek._sum?.duration_minutes ?? 0) / 60,
    pendingTimesheetsCount,
    projectsOverBudget,
    topEmployees,
    generatedAt: new Date().toISOString(),
  } satisfies IHrmsOrganization;
}
