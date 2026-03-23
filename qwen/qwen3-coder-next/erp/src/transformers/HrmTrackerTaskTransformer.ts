import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
import { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import { IHrmTrackerProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerProject";
import { IHrmTrackerTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerTask";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTrackerEmployeeAtSummaryTransformer } from "./HrmTrackerEmployeeAtSummaryTransformer";
import { HrmTrackerProjectAtSummaryTransformer } from "./HrmTrackerProjectAtSummaryTransformer";
import { HrmTrackerTaskAtSummaryTransformer } from "./HrmTrackerTaskAtSummaryTransformer";

export namespace HrmTrackerTaskTransformer {
  export type Payload = Prisma.hrm_tracker_tasksGetPayload<
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
        project: HrmTrackerProjectAtSummaryTransformer.select(),
        assignedEmployee: HrmTrackerEmployeeAtSummaryTransformer.select(),
        parentTask: HrmTrackerTaskAtSummaryTransformer.select(),
        subtasks: true,
        taskHistories: true,
        timelogs: true,
        timers: true,
      },
    } satisfies Prisma.hrm_tracker_tasksFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IHrmTrackerTask> {
    return {
      id: input.id,
      project: await HrmTrackerProjectAtSummaryTransformer.transform(
        input.project,
      ),
      assigned_employee: input.assignedEmployee
        ? await HrmTrackerEmployeeAtSummaryTransformer.transform(
            input.assignedEmployee,
          )
        : null,
      parent_task: input.parentTask
        ? await HrmTrackerTaskAtSummaryTransformer.transform(input.parentTask)
        : null,
      title: input.title,
      description: input.description ?? undefined,
      status: typia.assert<"completed" | "open" | "in-progress" | "closed">(
        input.status,
      ),
      priority: typia.assert<"low" | "medium" | "high" | "urgent">(
        input.priority,
      ),
      estimated_hours: input.estimated_hours ?? undefined,
      due_date: input.due_date ? toISOStringSafe(input.due_date) : null,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    };
  }
}
