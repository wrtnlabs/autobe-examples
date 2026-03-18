import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import { IHrmsProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProjectMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

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
          },
        } satisfies Prisma.hrms_employeesFindManyArgs,
        project: {
          select: {
            id: true,
            name: true,
            description: true,
            color_code: true,
            organization: {
              select: {
                id: true,
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
        } satisfies Prisma.hrms_projectsFindManyArgs,
      },
    } satisfies Prisma.hrms_project_membersFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IHrmsProjectMember> {
    return {
      id: input.id,
      role: input.role as "member" | "project-lead",
      status: input.status as "active" | "inactive",
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      employee: {
        id: input.employee.id,
        display_name: input.employee.display_name,
        position: input.employee.position ?? undefined,
        department_id: (input.employee.department_id ?? "") as string &
          tags.Format<"uuid">,
        timelog_count: 0,
        total_hours_logged: 0,
        timesheets_submitted: 0,
        timesheets_approved: 0,
        timesheets_pending: 0,
        status: input.employee.status as "active" | "inactive",
      } satisfies IHrmsEmployee.ISummary,
      project: {
        id: input.project.id,
        name: input.project.name,
        description: input.project.description ?? "",
        color_code: input.project.color_code,
        organization_id: input.project.organization.id as string &
          tags.Format<"uuid">,
        organization_name: input.project.organization.name,
        status: input.project.status as "active" | "completed" | "archived",
        budget_hours: input.project.budget_hours,
        start_date: input.project.start_date
          ? toISOStringSafe(input.project.start_date)
          : null,
        end_date: input.project.end_date
          ? toISOStringSafe(input.project.end_date)
          : null,
        planned_hours: 0,
        actual_hours: 0,
        budget_utilization_percentage: 0,
        total_tasks: 0,
        pending_tasks: 0,
        in_progress_tasks: 0,
        completed_tasks: 0,
        closed_tasks: 0,
        timelog_count: 0,
        created_at: toISOStringSafe(input.project.created_at),
        updated_at: toISOStringSafe(input.project.updated_at),
      } satisfies IHrmsProject.ISummary,
    };
  }
}
