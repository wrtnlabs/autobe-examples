import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { IErpHrmTimeTaskHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTaskHistoryEntry";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmTimeEmployeeDashboardSummaryAtSummaryTransformer } from "./ErpHrmTimeEmployeeDashboardSummaryAtSummaryTransformer";
import { ErpHrmTimeProjectAtSummaryTransformer } from "./ErpHrmTimeProjectAtSummaryTransformer";

export namespace ErpHrmTimeTaskHistoryEntryAtSummaryTransformer {
  export type Payload = Prisma.erp_hrm_time_tasksGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(
    input: Payload,
    cache: VariadicSingleton<
      Promise<IErpHrmTimeTaskHistoryEntry.ISummary>,
      [string]
    > = createCache(),
  ): Promise<IErpHrmTimeTaskHistoryEntry.ISummary> {
    return {
      id: input.id,
      project: await ErpHrmTimeProjectAtSummaryTransformer.transform(
        input.project,
      ),
      employee: input.employee
        ? await ErpHrmTimeEmployeeDashboardSummaryAtSummaryTransformer.transform(
            input.employee,
          )
        : null,
      parentTask: input.parentTask
        ? await cache.get(input.parentTask.id)
        : null,
      title: input.title,
      description: input.description ?? null,
      status: input.status,
      priority: input.priority,
      estimatedHours: input.estimated_hours ?? null,
      dueDate: input.due_date?.toISOString() ?? null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
  export function select() {
    return {
      select: {
        id: true,
        project: ErpHrmTimeProjectAtSummaryTransformer.select(),
        employee:
          ErpHrmTimeEmployeeDashboardSummaryAtSummaryTransformer.select(),
        parentTask: {
          select: {
            id: true,
          },
        },
        title: true,
        description: true,
        status: true,
        priority: true,
        estimated_hours: true,
        due_date: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.erp_hrm_time_tasksFindManyArgs;
  }
  export async function transformAll(
    inputs: Payload[],
  ): Promise<IErpHrmTimeTaskHistoryEntry.ISummary[]> {
    const cache = createCache();
    return await ArrayUtil.asyncMap(inputs, (x) => transform(x, cache));
  }
  function createCache() {
    const cache = new VariadicSingleton(
      async (id: string): Promise<IErpHrmTimeTaskHistoryEntry.ISummary> => {
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
