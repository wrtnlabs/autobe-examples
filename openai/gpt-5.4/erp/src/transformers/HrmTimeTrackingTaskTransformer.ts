import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTimeTrackingEmployeeAtSummaryTransformer } from "./HrmTimeTrackingEmployeeAtSummaryTransformer";
import { HrmTimeTrackingProjectAtSummaryTransformer } from "./HrmTimeTrackingProjectAtSummaryTransformer";
import { HrmTimeTrackingTaskAtSummaryTransformer } from "./HrmTimeTrackingTaskAtSummaryTransformer";

export namespace HrmTimeTrackingTaskTransformer {
  export type Payload = Prisma.hrm_time_tracking_tasksGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        project: HrmTimeTrackingProjectAtSummaryTransformer.select(),
        assignee: HrmTimeTrackingEmployeeAtSummaryTransformer.select(),
        parent: HrmTimeTrackingTaskAtSummaryTransformer.select(),
        title: true,
        description: true,
        status: true,
        priority: true,
        estimated_hours: true,
        due_date: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        children: {
          select: {
            id: true,
          },
        } satisfies Prisma.hrm_time_tracking_tasksFindManyArgs,
      },
    } satisfies Prisma.hrm_time_tracking_tasksFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackingTask> {
    return {
      id: input.id,
      project: await HrmTimeTrackingProjectAtSummaryTransformer.transform(
        input.project,
      ),
      assignee: input.assignee
        ? await HrmTimeTrackingEmployeeAtSummaryTransformer.transform(
            input.assignee,
          )
        : null,
      parent: input.parent
        ? await HrmTimeTrackingTaskAtSummaryTransformer.transform(input.parent)
        : null,
      title: input.title,
      description: input.description ?? null,
      status: input.status,
      priority: input.priority,
      estimated_hours: input.estimated_hours ?? null,
      due_date: input.due_date?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      children: input.children.length > 0,
    };
  }
}
