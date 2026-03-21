import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmEmployeeAtSummaryTransformer } from "./ErpHrmEmployeeAtSummaryTransformer";

export namespace ErpHrmTimesheetAtSummaryTransformer {
  export type Payload = Prisma.erp_hrm_timesheetsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        week_start_date: true,
        week_end_date: true,
        status: true,
        total_hours: true,
        submitted_at: true,
        reviewed_at: true,
        rejection_reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        employee: ErpHrmEmployeeAtSummaryTransformer.select(),
        reviewerEmployee: true,
        timesheetTimelogs: true,
      },
    } satisfies Prisma.erp_hrm_timesheetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimesheet.ISummary> {
    return {
      employee: await ErpHrmEmployeeAtSummaryTransformer.transform(
        input.employee,
      ),
      id: input.id,
      reviewedAt: input.reviewed_at?.toISOString() ?? null,
      status: input.status,
      submittedAt: input.submitted_at?.toISOString() ?? null,
      totalHours: input.total_hours,
      weekEndDate: input.week_end_date.toISOString(),
      weekStartDate: input.week_start_date.toISOString(),
    };
  }
}
