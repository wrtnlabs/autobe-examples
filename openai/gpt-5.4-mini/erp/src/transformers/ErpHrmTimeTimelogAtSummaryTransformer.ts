import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { IErpHrmTimeTaskHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTaskHistoryEntry";
import { IErpHrmTimeTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmTimeProjectAtSummaryTransformer } from "./ErpHrmTimeProjectAtSummaryTransformer";
import { ErpHrmTimeTaskHistoryEntryAtSummaryTransformer } from "./ErpHrmTimeTaskHistoryEntryAtSummaryTransformer";

export namespace ErpHrmTimeTimelogAtSummaryTransformer {
  export type Payload = Prisma.erp_hrm_time_timelogsGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimeTimelog.ISummary> {
    return {
      id: input.id,
      member: {} as IErpHrmTimeMember.ISummary,
      project: await ErpHrmTimeProjectAtSummaryTransformer.transform(
        input.project,
      ),
      task: input.task
        ? await ErpHrmTimeTaskHistoryEntryAtSummaryTransformer.transform(
            input.task,
          )
        : null,
      workDate: input.work_date.toISOString(),
      durationMinutes: input.duration_minutes,
      description: input.description ?? null,
      billable: input.billable,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
  export function select() {
    return {
      select: {
        id: true,
        work_date: true,
        duration_minutes: true,
        description: true,
        billable: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: { select: {} },
        project: ErpHrmTimeProjectAtSummaryTransformer.select(),
        task: ErpHrmTimeTaskHistoryEntryAtSummaryTransformer.select(),
        timesheetTimelogs: { select: {} },
      },
    } satisfies Prisma.erp_hrm_time_timelogsFindManyArgs;
  }
}
