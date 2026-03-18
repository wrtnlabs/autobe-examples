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

export async function getHrmsMemberProjectsDashboard(props: {
  member: MemberPayload;
}): Promise<IHrmsProject> {
  const memberMembership =
    await MyGlobal.prisma.hrms_organization_members.findFirst({
      where: {
        hrms_member_id: props.member.id,
        deleted_at: null,
      },
      include: {
        employees: {
          where: {
            deleted_at: null,
          },
          take: 1,
        },
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  if (!memberMembership || memberMembership.employees.length === 0) {
    throw new HttpException("Employee record not found", 404);
  }
  const employee = memberMembership.employees[0];
  const projectMemberships =
    await MyGlobal.prisma.hrms_project_members.findMany({
      where: {
        employee_id: employee.id,
        status: "active",
        deleted_at: null,
      },
      include: {
        project: true,
      },
      orderBy: {
        created_at: "desc",
      },
    });
  const projectIds = projectMemberships
    .map((m) => m.project.id)
    .filter((id): id is string => id !== undefined);
  const projects = await MyGlobal.prisma.hrms_projects.findMany({
    where: {
      id: {
        in: projectIds,
      },
      deleted_at: null,
    },
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
  });
  const projectMap = new Map(projects.map((p) => [p.id, p]));
  const organizationsSet = new Set(
    projectMemberships
      .map((m) => m.project.hrms_organization_id)
      .filter((id): id is string => id !== undefined),
  );
  const organizationData = await MyGlobal.prisma.hrms_organizations.findMany({
    where: {
      id: {
        in: Array.from(organizationsSet),
      },
    },
    select: {
      id: true,
      name: true,
    },
  });
  const organizationByName = new Map(
    organizationData.map((org) => [org.id, org.name]),
  );
  const projectsSummary: IHrmsProject.ISummary[] = await ArrayUtil.asyncMap(
    projectMemberships,
    async (membership) => {
      const project = projectMap.get(membership.project.id);
      if (!project) {
        return null!;
      }
      const [allTimelogs, allTasks] = await Promise.all([
        MyGlobal.prisma.hrms_timelogs.findMany({
          where: {
            project_id: project.id,
            employee_id: employee.id,
            deleted_at: null,
          },
        }),
        MyGlobal.prisma.hrms_tasks.findMany({
          where: {
            hrms_project_id: project.id,
            deleted_at: null,
          },
        }),
      ]);
      const totalMinutes = allTimelogs.reduce(
        (sum, t) => sum + (t.duration_minutes || 0),
        0,
      );
      const actualHours = totalMinutes / 60;
      let budgetUtilizationPercentage: number | null = null;
      if (project.budget_hours !== null && project.budget_hours > 0) {
        budgetUtilizationPercentage = Number(
          ((actualHours / project.budget_hours) * 100).toFixed(1),
        );
      }
      const taskCounts = allTasks.reduce(
        (
          acc,
          task: {
            status: string;
          },
        ) => {
          acc.total_tasks++;
          if (task.status === "open" || task.status === "pending") {
            acc.pending_tasks++;
          } else if (task.status === "in-progress") {
            acc.in_progress_tasks++;
          } else if (task.status === "completed") {
            acc.completed_tasks++;
          } else if (task.status === "closed") {
            acc.closed_tasks++;
          }
          return acc;
        },
        {
          total_tasks: 0,
          pending_tasks: 0,
          in_progress_tasks: 0,
          completed_tasks: 0,
          closed_tasks: 0,
        },
      );
      const timelogCount = allTimelogs.length;
      const organizationName =
        organizationByName.get(project.hrms_organization_id) ?? "";
      return {
        id: project.id as string & tags.Format<"uuid">,
        name: project.name,
        description: project.description ?? "",
        color_code: project.color_code,
        organization_id: project.hrms_organization_id as string &
          tags.Format<"uuid">,
        organization_name: organizationName,
        status: project.status as "active" | "completed" | "archived",
        budget_hours: project.budget_hours,
        start_date:
          project.start_date !== null && project.start_date !== undefined
            ? toISOStringSafe(project.start_date)
            : null,
        end_date:
          project.end_date !== null && project.end_date !== undefined
            ? toISOStringSafe(project.end_date)
            : null,
        planned_hours: project.budget_hours || 0,
        actual_hours: actualHours,
        budget_utilization_percentage: budgetUtilizationPercentage,
        total_tasks: taskCounts.total_tasks as number & tags.Type<"int32">,
        pending_tasks: taskCounts.pending_tasks as number & tags.Type<"int32">,
        in_progress_tasks: taskCounts.in_progress_tasks as number &
          tags.Type<"int32">,
        completed_tasks: taskCounts.completed_tasks as number &
          tags.Type<"int32">,
        closed_tasks: taskCounts.closed_tasks as number & tags.Type<"int32">,
        timelog_count: timelogCount as number & tags.Type<"int32">,
        created_at:
          project.created_at !== null && project.created_at !== undefined
            ? toISOStringSafe(project.created_at)
            : toISOStringSafe(new Date()),
        updated_at:
          project.updated_at !== null && project.updated_at !== undefined
            ? toISOStringSafe(project.updated_at)
            : toISOStringSafe(new Date()),
      } satisfies IHrmsProject.ISummary;
    },
  );
  return {
    dashboard_type: "personal" as const,
    generation_timestamp: toISOStringSafe(new Date()),
    hours_today: undefined,
    hours_this_week: undefined,
    active_timer: undefined,
    recent_timelogs: undefined,
    pending_timesheets_count: undefined,
    assigned_tasks: undefined,
    active_employee_count: undefined,
    total_hours_this_week: undefined,
    budget_alerts: projectsSummary.filter(
      (p) =>
        p.budget_utilization_percentage !== null &&
        p.budget_utilization_percentage! > 80,
    ),
    top_employees: undefined,
  } satisfies IHrmsProject;
}
