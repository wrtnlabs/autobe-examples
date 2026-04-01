import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployee";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { IErpHrmTimeTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTask";
import { IErpHrmTimeTimeReportRow } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimeReportRow";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmTimeEmployeeAtSummaryTransformer } from "./ErpHrmTimeEmployeeAtSummaryTransformer";
import { ErpHrmTimeProjectAtSummaryTransformer } from "./ErpHrmTimeProjectAtSummaryTransformer";
import { ErpHrmTimeTaskAtSummaryTransformer } from "./ErpHrmTimeTaskAtSummaryTransformer";

export namespace ErpHrmTimeTimeReportRowTransformer {
  export type Payload = Prisma.erp_hrm_time_time_report_rowsGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimeTimeReportRow> {
    return {
      id: input.id,
      organization: input.organization,
      employee: input.employee
        ? await ErpHrmTimeEmployeeAtSummaryTransformer.transform(input.employee)
        : null,
      project: input.project
        ? await ErpHrmTimeProjectAtSummaryTransformer.transform(input.project)
        : null,
      task: input.task
        ? await ErpHrmTimeTaskAtSummaryTransformer.transform(input.task)
        : null,
      reportDate: input.report_date.toISOString(),
      billable: input.billable,
      loggedMinutes: input.logged_minutes,
      loggedHours: input.logged_hours,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
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
        organization: true,
        employee: ErpHrmTimeEmployeeAtSummaryTransformer.select(),
        project: ErpHrmTimeProjectAtSummaryTransformer.select(),
        task: ErpHrmTimeTaskAtSummaryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_time_time_report_rowsFindManyArgs;
  }
}
