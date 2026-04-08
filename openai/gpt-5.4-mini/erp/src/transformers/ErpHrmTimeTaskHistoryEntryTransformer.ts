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
import { ErpHrmTimeTaskHistoryEntryAtSummaryTransformer } from "./ErpHrmTimeTaskHistoryEntryAtSummaryTransformer";

export namespace ErpHrmTimeTaskHistoryEntryTransformer {
  export type Payload = Prisma.erp_hrm_time_tasksGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimeTaskHistoryEntry> {
    return {
      id: input.id,
      project: await ErpHrmTimeProjectAtSummaryTransformer.transform(
        input.project,
      ),
      employee:
        input.employee === null
          ? null
          : await ErpHrmTimeEmployeeDashboardSummaryAtSummaryTransformer.transform(
              input.employee,
            ),
      parentTask:
        input.parentTask === null
          ? null
          : await ErpHrmTimeTaskHistoryEntryAtSummaryTransformer.transform(
              input.parentTask,
            ),
      title: input.title,
      description: input.description ?? null,
      status: input.status,
      priority: input.priority,
      estimatedHours:
        input.estimated_hours === null ? null : Number(input.estimated_hours),
      dueDate: input.due_date?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
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
        employee:
          ErpHrmTimeEmployeeDashboardSummaryAtSummaryTransformer.select(),
        parentTask: ErpHrmTimeTaskHistoryEntryAtSummaryTransformer.select(),
        subTasks: { select: {} },
        historyEntries: { select: {} },
        timelogs: { select: {} },
        timers: { select: {} },
        timeReportRows: { select: {} },
      },
    } satisfies Prisma.erp_hrm_time_tasksFindManyArgs;
  }
}
