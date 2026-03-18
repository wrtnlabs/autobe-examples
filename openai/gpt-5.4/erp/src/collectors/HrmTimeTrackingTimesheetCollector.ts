import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmTimeTrackingTimesheetCollector {
  export async function collect(props: {
    body: IHrmTimeTrackingTimesheet.ICreate;
    organization: IEntity;
    employee: IEntity;
  }) {
    const id: string = v4();
    const week_start_date: Date = new Date(props.body.week_start_date);
    const week_end_date: Date = new Date(
      week_start_date.getTime() + 6 * 24 * 60 * 60 * 1000,
    );
    const now: Date = new Date();
    return {
      id,
      week_start_date,
      week_end_date,
      status: "draft",
      submitted_at: null,
      reviewed_at: null,
      rejection_reason: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      organization: {
        connect: {
          id: props.organization.id,
        },
      },
      employee: {
        connect: {
          id: props.employee.id,
        },
      },
      timesheetTimelogs: undefined,
      snapshots: undefined,
    } satisfies Prisma.hrm_time_tracking_timesheetsCreateInput;
  }
}
