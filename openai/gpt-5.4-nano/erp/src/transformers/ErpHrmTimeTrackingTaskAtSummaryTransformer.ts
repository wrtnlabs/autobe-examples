import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import { IErpHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTask";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmTimeTrackingMemberAtSummaryTransformer } from "./ErpHrmTimeTrackingMemberAtSummaryTransformer";
import { ErpHrmTimeTrackingProjectAtSummaryTransformer } from "./ErpHrmTimeTrackingProjectAtSummaryTransformer";

export namespace ErpHrmTimeTrackingTaskAtSummaryTransformer {
  export type Payload = Prisma.erp_hrm_time_tracking_tasksGetPayload<
    ReturnType<typeof select>
  >;
  export function select(): Prisma.erp_hrm_time_tracking_tasksFindManyArgs {
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
        project: ErpHrmTimeTrackingProjectAtSummaryTransformer.select(),
        parentTask: ErpHrmTimeTrackingTaskAtSummaryTransformer.select(),
        assignedEmployee: ErpHrmTimeTrackingMemberAtSummaryTransformer.select(),
        childTasks: { select: { id: true } },
        timelogs: { select: { id: true } },
        timerSessions: { select: { id: true } },
        reportOutputs: { select: { id: true } },
      },
    };
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimeTrackingTask.ISummary> {
    return {
      id: input.id,
      title: input.title,
      description: input.description ?? null,
      status: input.status,
      priority: input.priority,
      estimated_hours:
        input.estimated_hours === null ? null : Number(input.estimated_hours),
      due_date: input.due_date ? toISOStringSafe(input.due_date) : null,
      project: await ErpHrmTimeTrackingProjectAtSummaryTransformer.transform(
        input.project,
      ),
      parent_task: input.parentTask
        ? await ErpHrmTimeTrackingTaskAtSummaryTransformer.transform(
            input.parentTask,
          )
        : null,
      assigned_employee: input.assignedEmployee
        ? await ErpHrmTimeTrackingMemberAtSummaryTransformer.transform(
            input.assignedEmployee,
          )
        : null,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    };
  }
}
