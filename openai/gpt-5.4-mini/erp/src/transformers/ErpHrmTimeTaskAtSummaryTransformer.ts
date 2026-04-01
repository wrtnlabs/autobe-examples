import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployee";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { IErpHrmTimeTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTask";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmTimeEmployeeAtSummaryTransformer } from "./ErpHrmTimeEmployeeAtSummaryTransformer";
import { ErpHrmTimeProjectAtSummaryTransformer } from "./ErpHrmTimeProjectAtSummaryTransformer";

export namespace ErpHrmTimeTaskAtSummaryTransformer {
  export type Payload = Prisma.erp_hrm_time_tasksGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(
    input: Payload,
    cache: VariadicSingleton<
      Promise<IErpHrmTimeTask.ISummary>,
      [string]
    > = createCache(),
  ): Promise<IErpHrmTimeTask.ISummary> {
    return {
      id: input.id,
      title: input.title,
      description: input.description ?? null,
      status: input.status,
      priority: input.priority,
      estimatedHours: input.estimated_hours ?? null,
      dueDate: input.due_date ? input.due_date.toISOString() : null,
      project: await ErpHrmTimeProjectAtSummaryTransformer.transform(
        input.project,
      ),
      employee: input.employee
        ? await ErpHrmTimeEmployeeAtSummaryTransformer.transform(input.employee)
        : null,
      parentTask: input.parent_task_id
        ? await cache.get(input.parent_task_id)
        : null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at ? input.deleted_at.toISOString() : null,
    };
  }
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
        project: ErpHrmTimeProjectAtSummaryTransformer.select(),
        employee: ErpHrmTimeEmployeeAtSummaryTransformer.select(),
        parent_task_id: true,
        subTasks: { select: { id: true } },
        historyEntries: { select: { id: true } },
        timelogs: { select: { id: true } },
        timers: { select: { id: true } },
        timeReportRows: { select: { id: true } },
      },
    } satisfies Prisma.erp_hrm_time_tasksFindManyArgs;
  }
  export async function transformAll(
    inputs: Payload[],
  ): Promise<IErpHrmTimeTask.ISummary[]> {
    const cache = createCache();
    return await ArrayUtil.asyncMap(inputs, (x) => transform(x, cache));
  }
  function createCache() {
    const cache = new VariadicSingleton(
      async (id: string): Promise<IErpHrmTimeTask.ISummary> => {
        const record =
          await MyGlobal.prisma.erp_hrm_time_tasks.findFirstOrThrow({
            ...select(),
            where: { id },
          });
        return transform(record, cache);
      },
    );
    return cache;
  }
}
