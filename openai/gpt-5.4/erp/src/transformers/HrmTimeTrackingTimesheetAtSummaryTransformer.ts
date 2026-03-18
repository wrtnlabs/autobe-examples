import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTimeTrackingEmployeeAtSummaryTransformer } from "./HrmTimeTrackingEmployeeAtSummaryTransformer";
import { HrmTimeTrackingOrganizationAtSummaryTransformer } from "./HrmTimeTrackingOrganizationAtSummaryTransformer";

export namespace HrmTimeTrackingTimesheetAtSummaryTransformer {
  export type Payload = Prisma.hrm_time_tracking_timesheetsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        organization: HrmTimeTrackingOrganizationAtSummaryTransformer.select(),
        employee: HrmTimeTrackingEmployeeAtSummaryTransformer.select(),
        week_start_date: true,
        week_end_date: true,
        status: true,
        submitted_at: true,
        reviewed_at: true,
        rejection_reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.hrm_time_tracking_timesheetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackingTimesheet.ISummary> {
    return {
      id: input.id,
      organization:
        await HrmTimeTrackingOrganizationAtSummaryTransformer.transform(
          input.organization,
        ),
      employee: await HrmTimeTrackingEmployeeAtSummaryTransformer.transform(
        input.employee,
      ),
      week_start_date: input.week_start_date.toISOString(),
      week_end_date: input.week_end_date.toISOString(),
      status: input.status,
      submitted_at: input.submitted_at?.toISOString() ?? null,
      reviewed_at: input.reviewed_at?.toISOString() ?? null,
      rejection_reason: input.rejection_reason,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
