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
import { HrmPlatformEmployeeAtSummaryTransformer } from "./HrmPlatformEmployeeAtSummaryTransformer";
import { HrmPlatformProjectAtSummaryTransformer } from "./HrmPlatformProjectAtSummaryTransformer";
import { HrmPlatformTaskAtSummaryTransformer } from "./HrmPlatformTaskAtSummaryTransformer";

export namespace HrmPlatformTaskTransformer {
  export type Payload = Prisma.hrm_platform_tasksGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
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
        project: HrmPlatformProjectAtSummaryTransformer.select(),
        assignee: HrmPlatformEmployeeAtSummaryTransformer.select(),
        parentTask: HrmPlatformTaskAtSummaryTransformer.select(),
        subtasks: HrmPlatformTaskAtSummaryTransformer.select(),
        histories: {
          select: {
            id: true,
          },
        } satisfies Prisma.hrm_platform_task_historiesFindManyArgs,
        timelogs: {
          select: {
            id: true,
          },
        } satisfies Prisma.hrm_platform_timelogsFindManyArgs,
        timers: {
          select: {
            id: true,
          },
        } satisfies Prisma.hrm_platform_timersFindManyArgs,
      },
    } satisfies Prisma.hrm_platform_tasksFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IHrmPlatformTask> {
    return {
      id: input.id,
      title: input.title,
      description: input.description ?? null,
      status: input.status,
      priority: input.priority,
      estimated_hours: input.estimated_hours ?? null,
      due_date: input.due_date?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      project: await HrmPlatformProjectAtSummaryTransformer.transform(
        input.project,
      ),
      assignee: input.assignee
        ? await HrmPlatformEmployeeAtSummaryTransformer.transform(
            input.assignee,
          )
        : null,
      parentTask: input.parentTask
        ? await HrmPlatformTaskAtSummaryTransformer.transform(input.parentTask)
        : null,
      subtasks: await ArrayUtil.asyncMap(
        input.subtasks,
        HrmPlatformTaskAtSummaryTransformer.transform,
      ),
      histories_count: input.histories.length,
      timelogs_count: input.timelogs.length,
      timers_count: input.timers.length,
    };
  }
}
