import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import { IHrmTimeTrackProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProject";
import { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { IHrmTimeTrackTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTask";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTimeTrackEmployeeAtSummaryTransformer } from "./HrmTimeTrackEmployeeAtSummaryTransformer";
import { HrmTimeTrackProjectAtSummaryTransformer } from "./HrmTimeTrackProjectAtSummaryTransformer";
import { HrmTimeTrackTaskAtSummaryTransformer } from "./HrmTimeTrackTaskAtSummaryTransformer";

export namespace HrmTimeTrackTaskTransformer {
  export type Payload = Prisma.hrm_time_track_tasksGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        description: true,
        priority: true,
        status: true,
        effort_estimate: true,
        effort_actual: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        project: HrmTimeTrackProjectAtSummaryTransformer.select(),
        employee: HrmTimeTrackEmployeeAtSummaryTransformer.select(),
        parentTask: HrmTimeTrackTaskAtSummaryTransformer.select(),
        subtasks: HrmTimeTrackTaskAtSummaryTransformer.select(),
        timelogs: {
          select: {},
        } satisfies Prisma.hrm_time_track_timelogsFindManyArgs,
        timers: {
          select: {},
        } satisfies Prisma.hrm_time_track_timersFindManyArgs,
        timerSnapshots: {
          select: {},
        } satisfies Prisma.hrm_time_track_timer_snapshotsFindManyArgs,
        activityLogs: {
          select: {},
        } satisfies Prisma.hrm_time_track_activity_logsFindManyArgs,
        taskHistories: {
          select: {},
        } satisfies Prisma.hrm_time_track_task_historiesFindManyArgs,
      },
    } satisfies Prisma.hrm_time_track_tasksFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IHrmTimeTrackTask> {
    return {
      id: input.id,
      title: input.title,
      description: input.description ?? null,
      priority: input.priority,
      status: input.status,
      effort_estimate: input.effort_estimate ?? null,
      effort_actual: input.effort_actual ?? null,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      project: await HrmTimeTrackProjectAtSummaryTransformer.transform(
        input.project,
      ),
      employee: input.employee
        ? await HrmTimeTrackEmployeeAtSummaryTransformer.transform(
            input.employee,
          )
        : null,
      parentTask: input.parentTask
        ? await HrmTimeTrackTaskAtSummaryTransformer.transform(input.parentTask)
        : null,
      subtasks: await ArrayUtil.asyncMap(
        input.subtasks,
        async (subtask) =>
          await HrmTimeTrackTaskAtSummaryTransformer.transform(subtask),
      ),
    };
  }
}
