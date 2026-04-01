import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import { IErpHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingOrganization";
import { IErpHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmTimeTrackingMemberAtSummaryTransformer } from "./ErpHrmTimeTrackingMemberAtSummaryTransformer";

export namespace ErpHrmTimeTrackingTimesheetAtSummaryTransformer {
  export type Payload = Prisma.erp_hrm_time_tracking_timesheetsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        week_start_at: true,
        week_end_at: true,
        status: true,
        submitted_at: true,
        approved_at: true,
        rejected_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        organization: {
          select: {
            id: true,
            name: true,
            description: true,
            logo_url: true,
            currency_code: true,
            timezone: true,
            fiscal_start_month: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
        employee: ErpHrmTimeTrackingMemberAtSummaryTransformer.select(),
        timelogs: {
          select: { id: true },
        } satisfies Prisma.erp_hrm_time_tracking_timelogsFindManyArgs,
        versioningLocks: {
          select: { id: true },
        } satisfies Prisma.erp_hrm_time_tracking_timesheet_versioning_locksFindManyArgs,
      },
    } satisfies Prisma.erp_hrm_time_tracking_timesheetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimeTrackingTimesheet.ISummary> {
    return {
      id: input.id,
      organization: {
        ...(input.organization as unknown as Record<string, never>),
      } as IErpHrmTimeTrackingOrganization.ISummary,
      employee: await ErpHrmTimeTrackingMemberAtSummaryTransformer.transform(
        input.employee,
      ),
      week_start_at: input.week_start_at.toISOString(),
      week_end_at: input.week_end_at.toISOString(),
      status: input.status,
      submitted_at: input.submitted_at
        ? input.submitted_at.toISOString()
        : null,
      approved_at: input.approved_at ? input.approved_at.toISOString() : null,
      rejected_at: input.rejected_at ? input.rejected_at.toISOString() : null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at ? input.deleted_at.toISOString() : null,
    };
  }
}
