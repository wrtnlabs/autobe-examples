import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { IErpHrmTimeTaskHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTaskHistoryEntry";
import { IErpHrmTimeTimeReportRow } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimeReportRow";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmTimeEmployeeDashboardSummaryAtSummaryTransformer } from "./ErpHrmTimeEmployeeDashboardSummaryAtSummaryTransformer";
import { ErpHrmTimeOrganizationDashboardSummaryAtSummaryTransformer } from "./ErpHrmTimeOrganizationDashboardSummaryAtSummaryTransformer";
import { ErpHrmTimeProjectAtSummaryTransformer } from "./ErpHrmTimeProjectAtSummaryTransformer";
import { ErpHrmTimeTaskHistoryEntryAtSummaryTransformer } from "./ErpHrmTimeTaskHistoryEntryAtSummaryTransformer";

export namespace ErpHrmTimeTimeReportRowAtSummaryTransformer {
  export type Payload = Prisma.erp_hrm_time_time_report_rowsGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimeTimeReportRow.ISummary> {
    return {
      id: input.id,
      organization:
        await ErpHrmTimeOrganizationDashboardSummaryAtSummaryTransformer.transform(
          input.organization,
        ),
      employee: input.employee
        ? await ErpHrmTimeEmployeeDashboardSummaryAtSummaryTransformer.transform(
            input.employee,
          )
        : null,
      project: input.project
        ? await ErpHrmTimeProjectAtSummaryTransformer.transform(input.project)
        : null,
      task: input.task
        ? await ErpHrmTimeTaskHistoryEntryAtSummaryTransformer.transform(
            input.task,
          )
        : null,
      reportDate: input.report_date.toISOString(),
      billable: input.billable,
      loggedMinutes: input.logged_minutes,
      loggedHours: input.logged_hours,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
  export function select() {
    return {
      select: {
        id: true,
        report_date: true,
        billable: true,
        logged_minutes: true,
        logged_hours: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        organization:
          ErpHrmTimeOrganizationDashboardSummaryAtSummaryTransformer.select(),
        employee:
          ErpHrmTimeEmployeeDashboardSummaryAtSummaryTransformer.select(),
        project: ErpHrmTimeProjectAtSummaryTransformer.select(),
        task: ErpHrmTimeTaskHistoryEntryAtSummaryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_time_time_report_rowsFindManyArgs;
  }
}
