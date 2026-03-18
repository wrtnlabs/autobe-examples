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
import { ErpHrmTimeTrackingTaskAtSummaryTransformer } from "./ErpHrmTimeTrackingTaskAtSummaryTransformer";

export namespace ErpHrmTimeTrackingTaskTransformer {
  export type Payload = Prisma.erp_hrm_time_tracking_tasksGetPayload<
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
        project: ErpHrmTimeTrackingProjectAtSummaryTransformer.select(),
        parentTask: ErpHrmTimeTrackingTaskAtSummaryTransformer.select(),
        assignedEmployee: ErpHrmTimeTrackingMemberAtSummaryTransformer.select(),
        // Payload typing requirements; not mapped to IErpHrmTimeTrackingTask
        childTasks: true,
        timelogs: true,
        timerSessions: true,
        reportOutputs: true,
      },
    } satisfies Prisma.erp_hrm_time_tracking_tasksFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimeTrackingTask> {
    return {
      id: input.id,
      project: await ErpHrmTimeTrackingProjectAtSummaryTransformer.transform(
        input.project,
      ),
      parentTask: input.parentTask
        ? await ErpHrmTimeTrackingTaskAtSummaryTransformer.transform(
            input.parentTask,
          )
        : null,
      assignedEmployee: input.assignedEmployee
        ? await ErpHrmTimeTrackingMemberAtSummaryTransformer.transform(
            input.assignedEmployee,
          )
        : null,
      title: input.title,
      description: input.description ?? null,
      status: input.status,
      priority: input.priority,
      estimatedHours: input.estimated_hours ?? null,
      dueDate: input.due_date ? input.due_date.toISOString() : null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at ? input.deleted_at.toISOString() : null,
    };
  }
}
