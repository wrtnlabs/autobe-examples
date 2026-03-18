import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTimeTrackingEmployeeAtSummaryTransformer } from "./HrmTimeTrackingEmployeeAtSummaryTransformer";

export namespace HrmTimeTrackingTaskAtSummaryTransformer {
  export type Payload = Prisma.hrm_time_tracking_tasksGetPayload<
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
        assignee: HrmTimeTrackingEmployeeAtSummaryTransformer.select(),
        parent: {
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
            assignee: HrmTimeTrackingEmployeeAtSummaryTransformer.select(),
            parent: false,
          },
        },
      },
    } satisfies Prisma.hrm_time_tracking_tasksFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackingTask.ISummary> {
    return {
      id: input.id,
      title: input.title,
      description: input.description ?? null,
      status: input.status,
      priority: input.priority,
      estimated_hours: input.estimated_hours ?? null,
      due_date: input.due_date ? toISOStringSafe(input.due_date) : null,
      assignee: input.assignee
        ? await HrmTimeTrackingEmployeeAtSummaryTransformer.transform(
            input.assignee,
          )
        : null,
      parent: input.parent
        ? {
            id: input.parent.id,
            title: input.parent.title,
            description: input.parent.description ?? null,
            status: input.parent.status,
            priority: input.parent.priority,
            estimated_hours: input.parent.estimated_hours ?? null,
            due_date: input.parent.due_date
              ? toISOStringSafe(input.parent.due_date)
              : null,
            assignee: input.parent.assignee
              ? await HrmTimeTrackingEmployeeAtSummaryTransformer.transform(
                  input.parent.assignee,
                )
              : null,
            parent: null,
            created_at: toISOStringSafe(input.parent.created_at),
            updated_at: toISOStringSafe(input.parent.updated_at),
            deleted_at: input.parent.deleted_at
              ? toISOStringSafe(input.parent.deleted_at)
              : null,
          }
        : null,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    };
  }
}
