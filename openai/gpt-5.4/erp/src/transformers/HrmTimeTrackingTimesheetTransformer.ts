import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTimeTrackingEmployeeAtSummaryTransformer } from "./HrmTimeTrackingEmployeeAtSummaryTransformer";
import { HrmTimeTrackingOrganizationAtSummaryTransformer } from "./HrmTimeTrackingOrganizationAtSummaryTransformer";
import { HrmTimeTrackingTimelogTransformer } from "./HrmTimeTrackingTimelogTransformer";

export namespace HrmTimeTrackingTimesheetTransformer {
  export type Payload = Prisma.hrm_time_tracking_timesheetsGetPayload<
    ReturnType<typeof select>
  >;
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
        organization: HrmTimeTrackingOrganizationAtSummaryTransformer.select(),
        employee: HrmTimeTrackingEmployeeAtSummaryTransformer.select(),
        timesheetTimelogs: {
          select: {
            timelog: HrmTimeTrackingTimelogTransformer.select(),
          },
        } satisfies Prisma.hrm_time_tracking_timesheet_timelogsFindManyArgs,
      },
    } satisfies Prisma.hrm_time_tracking_timesheetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackingTimesheet> {
    const timelogs = await ArrayUtil.asyncMap(
      input.timesheetTimelogs,
      async (timesheetTimelog) =>
        HrmTimeTrackingTimelogTransformer.transform(timesheetTimelog.timelog),
    );
    const totalMinutes = input.timesheetTimelogs.reduce(
      (sum, timesheetTimelog) =>
        sum + timesheetTimelog.timelog.duration_minutes,
      0,
    );
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
      timelogs,
      total_hours: totalMinutes / 60,
      submitted_at: input.submitted_at?.toISOString() ?? null,
      reviewed_at: input.reviewed_at?.toISOString() ?? null,
      rejection_reason: (input.rejection_reason ??
        null) as IHrmTimeTrackingTimesheet["rejection_reason"],
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
