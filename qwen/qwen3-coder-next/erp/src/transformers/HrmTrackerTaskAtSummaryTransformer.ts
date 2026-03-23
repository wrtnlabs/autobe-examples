import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
import { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import { IHrmTrackerTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerTask";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTrackerEmployeeAtSummaryTransformer } from "./HrmTrackerEmployeeAtSummaryTransformer";

export namespace HrmTrackerTaskAtSummaryTransformer {
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
        project: true,
        assignedEmployee: HrmTrackerEmployeeAtSummaryTransformer.select(),
        parentTask: true,
        subtasks: true,
        taskHistories: true,
        timelogs: true,
        timers: true,
      },
    } satisfies Prisma.hrm_tracker_tasksFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTrackerTask.ISummary> {
    return {
      id: input.id,
      title: input.title,
      status: input.status,
      priority: input.priority,
      due_date: input.due_date?.toISOString() ?? null,
      assignedEmployee: input.assignedEmployee
        ? await HrmTrackerEmployeeAtSummaryTransformer.transform(
            input.assignedEmployee,
          )
        : null,
    };
  }
}
