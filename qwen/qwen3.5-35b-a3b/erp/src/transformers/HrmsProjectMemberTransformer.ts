import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import { IHrmsProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProjectMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmsProjectMemberTransformer {
  export type Payload = Prisma.hrms_project_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        role: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        employee: {
          select: {
            id: true,
            display_name: true,
            position: true,
            department_id: true,
            status: true,
            timelogs: {
              select: { duration_minutes: true },
            } satisfies Prisma.hrms_timelogsFindManyArgs,
          },
        } satisfies Prisma.hrms_employeesFindManyArgs,
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
            _count: {
              select: {
                timelogs: true,
                tasks: true,
              },
            },
            timelogs: {
              select: { duration_minutes: true },
            } satisfies Prisma.hrms_timelogsFindManyArgs,
            organization: {
              select: {
                name: true,
              },
            },
          },
        } satisfies Prisma.hrms_projectsFindManyArgs,
      },
    } satisfies Prisma.hrms_project_membersFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IHrmsProjectMember> {
    const projectTimelogs = input.project.timelogs;
    const projectCount = input.project._count.tasks;
    const projectTimelogCount = input.project._count.timelogs;
    const budgetHours = input.project.budget_hours;
    const actualHours =
      projectTimelogs.length > 0
        ? projectTimelogs.reduce(
            (sum: number, t) => sum + t.duration_minutes,
            0,
          ) / 60
        : 0;
    const budgetUtilization =
      budgetHours && budgetHours > 0
        ? Math.min(100, Math.round((actualHours / budgetHours) * 100) / 100)
        : null;
    const employeeTimelogs = input.employee.timelogs;
    const totalHoursLogged =
      employeeTimelogs.length > 0
        ? employeeTimelogs.reduce(
            (sum: number, t) => sum + t.duration_minutes,
            0,
          )
        : 0;
    return {
      id: input.id,
      role: input.role as "member" | "project-lead",
      status: input.status as "active" | "inactive",
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      employee: {
        id: input.employee.id,
        display_name: input.employee.display_name,
        position: input.employee.position ?? undefined,
        department_id: input.employee.department_id as string &
          tags.Format<"uuid">,
        status: input.employee.status,
        total_hours_logged: totalHoursLogged,
        timelog_count: employeeTimelogs.length,
        timesheets_submitted: 0,
        timesheets_approved: 0,
        timesheets_pending: 0,
      },
      project: {
        id: input.project.id,
        name: input.project.name,
        description: input.project.description ?? "",
        color_code: input.project.color_code,
        organization_id: input.project.hrms_organization_id,
        organization_name: input.project.organization?.name ?? "",
        status: input.project.status as "active" | "archived" | "completed",
        budget_hours: budgetHours ?? null,
        start_date: input.project.start_date?.toISOString() ?? null,
        end_date: input.project.end_date?.toISOString() ?? null,
        planned_hours: budgetHours ?? 0,
        actual_hours: actualHours,
        budget_utilization_percentage: budgetUtilization,
        total_tasks: projectCount,
        pending_tasks: 0,
        in_progress_tasks: 0,
        completed_tasks: 0,
        closed_tasks: 0,
        timelog_count: projectTimelogCount,
        created_at: input.project.created_at.toISOString(),
        updated_at: input.project.updated_at.toISOString(),
      },
    };
  }
}
