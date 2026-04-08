import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { IErpHrmTimeTaskHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTaskHistoryEntry";
import { IErpHrmTimeTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimer";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmTimeEmployeeDashboardSummaryAtSummaryTransformer } from "./ErpHrmTimeEmployeeDashboardSummaryAtSummaryTransformer";
import { ErpHrmTimeProjectAtSummaryTransformer } from "./ErpHrmTimeProjectAtSummaryTransformer";
import { ErpHrmTimeTaskHistoryEntryAtSummaryTransformer } from "./ErpHrmTimeTaskHistoryEntryAtSummaryTransformer";

export namespace ErpHrmTimeTimerAtSummaryTransformer {
  export type Payload = Prisma.erp_hrm_time_timersGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimeTimer.ISummary> {
    return {
      id: input.id,
      member: {} as IErpHrmTimeMember.ISummary,
      employee:
        await ErpHrmTimeEmployeeDashboardSummaryAtSummaryTransformer.transform(
          input.employee,
        ),
      project: await ErpHrmTimeProjectAtSummaryTransformer.transform(
        input.project,
      ),
      task:
        input.task === null
          ? null
          : await ErpHrmTimeTaskHistoryEntryAtSummaryTransformer.transform(
              input.task,
            ),
      startedAt: input.started_at.toISOString(),
      description: input.description,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
  export function select() {
    return {
      select: {
        id: true,
        started_at: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: true,
        employee:
          ErpHrmTimeEmployeeDashboardSummaryAtSummaryTransformer.select(),
        project: ErpHrmTimeProjectAtSummaryTransformer.select(),
        task: ErpHrmTimeTaskHistoryEntryAtSummaryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_time_timersFindManyArgs;
  }
}
