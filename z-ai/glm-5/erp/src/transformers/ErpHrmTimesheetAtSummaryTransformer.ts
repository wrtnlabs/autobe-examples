import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmEmployeeAtSummaryTransformer } from "./ErpHrmEmployeeAtSummaryTransformer";
import { ErpHrmMemberAtSummaryTransformer } from "./ErpHrmMemberAtSummaryTransformer";

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
        employee: ErpHrmEmployeeAtSummaryTransformer.select(),
        reviewer: ErpHrmMemberAtSummaryTransformer.select(),
        _count: {
          select: {
            timesheetTimelogs: true,
          },
        },
      },
    } satisfies Prisma.erp_hrm_timesheetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimesheet.ISummary> {
    return {
      id: input.id,
      employee: await ErpHrmEmployeeAtSummaryTransformer.transform(
        input.employee,
      ),
      reviewer: input.reviewer
        ? await ErpHrmMemberAtSummaryTransformer.transform(input.reviewer)
        : null,
      weekStartDate: input.week_start_date.toISOString(),
      weekEndDate: input.week_end_date.toISOString(),
      status: input.status,
      totalHours: input.total_hours,
      timelogsCount: input._count.timesheetTimelogs,
      submittedAt: input.submitted_at?.toISOString() ?? null,
      reviewedAt: input.reviewed_at?.toISOString() ?? null,
      rejectionReason: input.rejection_reason,
      createdAt: input.created_at.toISOString(),
    };
  }
}
