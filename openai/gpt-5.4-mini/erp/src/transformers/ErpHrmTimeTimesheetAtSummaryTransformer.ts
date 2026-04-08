import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { IErpHrmTimeTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmTimeEmployeeDashboardSummaryAtSummaryTransformer } from "./ErpHrmTimeEmployeeDashboardSummaryAtSummaryTransformer";

export namespace ErpHrmTimeTimesheetAtSummaryTransformer {
  export type Payload = Prisma.erp_hrm_time_timesheetsGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimeTimesheet.ISummary> {
    return {
      id: input.id,
      employee:
        await ErpHrmTimeEmployeeDashboardSummaryAtSummaryTransformer.transform(
          input.employee,
        ),
      reviewedByMember: input.reviewedByMember
        ? ({
            // Minimal nullable summary projection from the loaded relation.
          } as IErpHrmTimeMember.ISummary)
        : null,
      weekStartDate: input.week_start_date.toISOString(),
      weekEndDate: input.week_end_date.toISOString(),
      status: input.status,
      submittedAt: input.submitted_at?.toISOString() ?? null,
      reviewedAt: input.reviewed_at?.toISOString() ?? null,
      rejectionReason: input.rejection_reason ?? null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
  export function select() {
    return {
      select: {
        id: true,
        week_start_date: true,
        week_end_date: true,
        status: true,
        submitted_at: true,
        reviewed_at: true,
        rejection_reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        employee:
          ErpHrmTimeEmployeeDashboardSummaryAtSummaryTransformer.select(),
        reviewedByMember: true,
        timesheetTimelogs: true,
      },
    } satisfies Prisma.erp_hrm_time_timesheetsFindManyArgs;
  }
}
