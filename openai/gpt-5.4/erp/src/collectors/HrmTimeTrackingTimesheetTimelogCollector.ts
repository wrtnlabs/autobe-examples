import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheetTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmTimeTrackingTimesheetTimelogCollector {
  export async function collect(props: {
    body: IHrmTimeTrackingTimesheetTimelog.ICreate;
    timesheet: IEntity;
  }) {
    return {
      id: v4(),
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      timesheet: {
        connect: {
          id: props.timesheet.id,
        },
      },
      timelog: {
        connect: {
          id: props.body.hrm_time_tracking_timelog_id,
        },
      },
    } satisfies Prisma.hrm_time_tracking_timesheet_timelogsCreateInput;
  }
}
