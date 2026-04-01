import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmPlatformTaskAtSummaryTransformer {
  export type Payload = Prisma.hrm_platform_tasksGetPayload<
    ReturnType<typeof select>
  >;
  export function select(): Prisma.hrm_platform_tasksFindManyArgs {
    return {
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        estimated_hours: true,
        due_date: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        hrm_platform_projects_id: true,
        hrm_platform_employees_id: true,
        hrm_platform_tasks_id: true,
      },
      include: {
        children: {
          select: { id: true },
        } satisfies Prisma.hrm_platform_tasksFindManyArgs,
        histories: {
          select: { id: true },
        } satisfies Prisma.hrm_platform_task_historiesFindManyArgs,
        taskTimelogs: {
          select: { id: true },
        } satisfies Prisma.hrm_platform_timelogsFindManyArgs,
        timers: {
          select: { id: true },
        } satisfies Prisma.hrm_platform_timersFindManyArgs,
      },
    } satisfies Prisma.hrm_platform_tasksFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformTask.ISummary> {
    return {
      id: input.id,
      title: input.title,
      status: input.status,
      priority: input.priority,
      estimated_hours:
        input.estimated_hours !== null && input.estimated_hours !== undefined
          ? Number(input.estimated_hours)
          : null,
      due_date: input.due_date ? toISOStringSafe(input.due_date) : null,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      project: null as any,
      assignedEmployee: null as any,
      parent: null as any,
    };
  }
}
