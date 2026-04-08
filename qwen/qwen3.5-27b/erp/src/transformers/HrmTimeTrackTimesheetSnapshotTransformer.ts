import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { IHrmTimeTrackTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimesheet";
import { IHrmTimeTrackTimesheetSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimesheetSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTimeTrackEmployeeAtSummaryTransformer } from "./HrmTimeTrackEmployeeAtSummaryTransformer";
import { HrmTimeTrackMemberAtSummaryTransformer } from "./HrmTimeTrackMemberAtSummaryTransformer";

export namespace HrmTimeTrackTimesheetSnapshotTransformer {
  export type Payload = Prisma.hrm_time_track_timesheet_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        created_at: true,
        timesheet: {
          select: {
            id: true,
            status: true,
            week_start_date: true,
            week_end_date: true,
            employee: HrmTimeTrackEmployeeAtSummaryTransformer.select(),
            approver: HrmTimeTrackMemberAtSummaryTransformer.select(),
          },
        } satisfies Prisma.hrm_time_track_timesheetsFindManyArgs,
        member: HrmTimeTrackMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_time_track_timesheet_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackTimesheetSnapshot> {
    return {
      id: input.id,
      timesheet: {
        id: input.timesheet.id,
        status: input.timesheet.status,
        week_start_date: input.timesheet.week_start_date.toISOString(),
        week_end_date: input.timesheet.week_end_date.toISOString(),
        total_hours: 0,
        employee: await HrmTimeTrackEmployeeAtSummaryTransformer.transform(
          input.timesheet.employee,
        ),
        approver: input.timesheet.approver
          ? await HrmTimeTrackMemberAtSummaryTransformer.transform(
              input.timesheet.approver,
            )
          : null,
      },
      member: await HrmTimeTrackMemberAtSummaryTransformer.transform(
        input.member,
      ),
      status: input.status,
      created_at: input.created_at.toISOString(),
    };
  }
}
