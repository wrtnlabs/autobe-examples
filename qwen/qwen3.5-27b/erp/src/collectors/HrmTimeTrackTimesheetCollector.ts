import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmTimeTrackTimesheetCollector {
  export async function collect(props: {
    body: IHrmTimeTrackTimesheet.ICreate;
    hrmTimeTrackEmployees: IEntity;
  }) {
    const id = v4();
    // Calculate week_end_date (Sunday) from week_start_date (Monday)
    const weekStart = new Date(props.body.week_start_date);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    return {
      id,
      status: "draft",
      week_start_date: weekStart,
      week_end_date: weekEnd,
      approved_at: null,
      rejected_at: null,
      rejection_reason: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      employee: { connect: { id: props.hrmTimeTrackEmployees.id } },
      approver: undefined,
    } satisfies Prisma.hrm_time_track_timesheetsCreateInput;
  }
}
