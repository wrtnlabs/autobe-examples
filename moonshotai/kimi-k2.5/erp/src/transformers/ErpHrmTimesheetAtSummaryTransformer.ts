import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmOrganizationMemberAtSummaryTransformer } from "./ErpHrmOrganizationMemberAtSummaryTransformer";

export namespace ErpHrmTimesheetAtSummaryTransformer {
  export type Payload = Prisma.erp_hrm_timesheetsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        week_start_date: true,
        week_end_date: true,
        submitted_at: true,
        reviewed_at: true,
        rejection_reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        organizationMember:
          ErpHrmOrganizationMemberAtSummaryTransformer.select(),
        reviewedBy: ErpHrmOrganizationMemberAtSummaryTransformer.select(),
        timelogs: {
          select: {
            duration_minutes: true,
          },
        } satisfies Prisma.erp_hrm_timelogsFindManyArgs,
      },
    } satisfies Prisma.erp_hrm_timesheetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimesheet.ISummary> {
    const totalMinutes = input.timelogs.reduce(
      (sum, t) => sum + t.duration_minutes,
      0,
    );
    return {
      id: input.id,
      status: input.status,
      weekStartDate: input.week_start_date.toISOString(),
      weekEndDate: input.week_end_date.toISOString(),
      submittedAt: input.submitted_at?.toISOString() ?? null,
      reviewedAt: input.reviewed_at?.toISOString() ?? null,
      rejectionReason: input.rejection_reason ?? null,
      totalHours: totalMinutes / 60,
      organizationMember:
        await ErpHrmOrganizationMemberAtSummaryTransformer.transform(
          input.organizationMember,
        ),
      reviewedBy: input.reviewedBy
        ? await ErpHrmOrganizationMemberAtSummaryTransformer.transform(
            input.reviewedBy,
          )
        : null,
      createdAt: input.created_at.toISOString(),
    };
  }
}
