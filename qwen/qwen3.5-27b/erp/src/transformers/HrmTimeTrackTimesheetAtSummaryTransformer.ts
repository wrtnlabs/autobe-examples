import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { IHrmTimeTrackTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTimeTrackEmployeeAtSummaryTransformer } from "./HrmTimeTrackEmployeeAtSummaryTransformer";
import { HrmTimeTrackMemberAtSummaryTransformer } from "./HrmTimeTrackMemberAtSummaryTransformer";

export namespace HrmTimeTrackTimesheetAtSummaryTransformer {
  export type Payload = Prisma.hrm_time_track_timesheetsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        week_start_date: true,
        week_end_date: true,
        employee: HrmTimeTrackEmployeeAtSummaryTransformer.select(),
        approver: HrmTimeTrackMemberAtSummaryTransformer.select(),
        timelogs: {
          select: {
            timelog: {
              select: {
                duration_seconds: true,
              },
            },
          },
        } satisfies Prisma.hrm_time_track_timesheet_timelogsFindManyArgs,
      },
    } satisfies Prisma.hrm_time_track_timesheetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackTimesheet.ISummary> {
    const totalHours =
      input.timelogs.reduce(
        (sum, log) => sum + log.timelog.duration_seconds,
        0,
      ) / 3600;
    return {
      id: input.id,
      status: input.status,
      week_start_date: toISOStringSafe(input.week_start_date),
      week_end_date: toISOStringSafe(input.week_end_date),
      total_hours: totalHours,
      employee: await HrmTimeTrackEmployeeAtSummaryTransformer.transform(
        input.employee,
      ),
      approver: input.approver
        ? await HrmTimeTrackMemberAtSummaryTransformer.transform(input.approver)
        : null,
    };
  }
}
