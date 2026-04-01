import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import { IHrmsTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimer";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmsTimerTransformer {
  export type Payload = Prisma.hrms_timersGetPayload<ReturnType<typeof select>>;
  export function select() {
    return {
      select: {
        id: true,
        start_at: true,
        description: true,
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
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            description: true,
            color_code: true,
            hrms_organization_id: true,
            organization: {
              select: {
                name: true,
              },
            },
            status: true,
            budget_hours: true,
            start_date: true,
            end_date: true,
            created_at: true,
            updated_at: true,
          },
        },
        task: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.hrms_timersFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IHrmsTimer> {
    return {
      id: input.id,
      employee: {
        id: input.employee.id,
        display_name: input.employee.display_name,
        position: input.employee.position ?? undefined,
        department_id: input.employee.department_id ?? "",
        status: input.employee.status ?? "",
        total_hours_logged: 0,
        timelog_count: 0,
        timesheets_submitted: 0,
        timesheets_approved: 0,
        timesheets_pending: 0,
      } satisfies IHrmsEmployee.ISummary,
      project: {
        id: input.project.id,
        name: input.project.name,
        description: input.project.description ?? "",
        color_code: input.project.color_code,
        organization_id: input.project.hrms_organization_id,
        organization_name: input.project.organization.name,
        status: input.project.status as IHrmsProject.ISummary["status"],
        budget_hours: input.project.budget_hours ?? 0,
        start_date: input.project.start_date
          ? toISOStringSafe(input.project.start_date)
          : null,
        end_date: input.project.end_date
          ? toISOStringSafe(input.project.end_date)
          : null,
        total_tasks: 0,
        pending_tasks: 0,
        in_progress_tasks: 0,
        completed_tasks: 0,
        closed_tasks: 0,
        planned_hours: input.project.budget_hours ?? 0,
        actual_hours: 0,
        budget_utilization_percentage: null,
        timelog_count: 0,
        created_at: toISOStringSafe(input.project.created_at),
        updated_at: toISOStringSafe(input.project.updated_at),
      } satisfies IHrmsProject.ISummary,
      task: input.task
        ? ({
            project_id: input.task.id,
            project_name: "",
            task_count: 0,
          } as IHrmsTask.ISummary)
        : null,
      start_at: toISOStringSafe(input.start_at),
      description: input.description ?? undefined,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    };
  }
}
