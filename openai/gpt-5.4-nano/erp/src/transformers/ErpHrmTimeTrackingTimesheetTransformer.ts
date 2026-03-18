import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ErpHrmTimeTrackingTimesheetTransformer {
  export type Payload = Prisma.erp_hrm_time_tracking_timesheetsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        erp_hrm_time_tracking_organization_id: true,
        erp_hrm_time_tracking_employee_id: true,
        week_start_at: true,
        week_end_at: true,
        status: true,
        submitted_at: true,
        approved_at: true,
        rejected_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.erp_hrm_time_tracking_timesheetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimeTrackingTimesheet> {
    return {
      id: input.id,
      erpHrmTimeTrackingOrganizationId:
        input.erp_hrm_time_tracking_organization_id,
      erpHrmTimeTrackingEmployeeId: input.erp_hrm_time_tracking_employee_id,
      weekStartAt: input.week_start_at.toISOString(),
      weekEndAt: input.week_end_at.toISOString(),
      status: input.status,
      submittedAt: input.submitted_at?.toISOString() ?? null,
      approvedAt: input.approved_at?.toISOString() ?? null,
      rejectedAt: input.rejected_at?.toISOString() ?? null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
}
