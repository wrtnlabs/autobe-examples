import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import { IErpHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTask";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmTimeTrackingMemberAtSummaryTransformer } from "./ErpHrmTimeTrackingMemberAtSummaryTransformer";
import { ErpHrmTimeTrackingProjectAtSummaryTransformer } from "./ErpHrmTimeTrackingProjectAtSummaryTransformer";

export namespace ErpHrmTimeTrackingTaskAtSummaryTransformer {
  export type Payload = Prisma.erp_hrm_time_tracking_tasksGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        erp_hrm_time_tracking_project_id: true,
        parent_task_id: true,
        assigned_employee_id: true,
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
        // Prevent recursive nesting in Prisma payload; resolve via cache.
        parentTask: undefined,
        assignedEmployee: ErpHrmTimeTrackingMemberAtSummaryTransformer.select(),
        // Required mapping coverage: not used by ISummary transform.
        childTasks: undefined,
        timelogs: undefined,
        timerSessions: undefined,
        reportOutputs: undefined,
      },
    } satisfies Prisma.erp_hrm_time_tracking_tasksFindManyArgs;
  }
  export async function transform(
    input: Payload,
    cache: VariadicSingleton<
      Promise<IErpHrmTimeTrackingTask.ISummary>,
      [string]
    > = createCache(),
  ): Promise<IErpHrmTimeTrackingTask.ISummary> {
    return {
      id: input.id,
      title: input.title,
      description: input.description ?? null,
      status: input.status,
      priority: input.priority,
      estimated_hours: input.estimated_hours ?? null,
      due_date: input.due_date ? input.due_date.toISOString() : null,
      project: await ErpHrmTimeTrackingProjectAtSummaryTransformer.transform(
        input.project,
      ),
      parent_task: input.parent_task_id
        ? await cache.get(input.parent_task_id)
        : null,
      assigned_employee: input.assignedEmployee
        ? await ErpHrmTimeTrackingMemberAtSummaryTransformer.transform(
            input.assignedEmployee,
          )
        : null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at ? input.deleted_at.toISOString() : null,
    };
  }
  export async function transformAll(
    inputs: Payload[],
  ): Promise<IErpHrmTimeTrackingTask.ISummary[]> {
    const cache = createCache();
    return await ArrayUtil.asyncMap(inputs, (x) => transform(x, cache));
  }
  function createCache() {
    const cache = new VariadicSingleton(
      async (id: string): Promise<IErpHrmTimeTrackingTask.ISummary> => {
        const record =
          await MyGlobal.prisma.erp_hrm_time_tracking_tasks.findFirstOrThrow({
            ...select(),
            where: { id },
          });
        return transform(record, cache);
      },
    );
    return cache;
  }
}
