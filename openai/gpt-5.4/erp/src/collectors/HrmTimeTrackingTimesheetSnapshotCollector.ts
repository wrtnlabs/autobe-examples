import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingTimesheetSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheetSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmTimeTrackingTimesheetSnapshotCollector {
  export async function collect(props: {
    body: IHrmTimeTrackingTimesheetSnapshot.ICreate;
    timesheet: IEntity;
  }) {
    return {
      id: v4(),
      locked: props.body.locked,
      timesheet: {
        connect: {
          id: props.timesheet.id,
        },
      },
    } satisfies Prisma.hrm_time_tracking_timesheet_snapshotsCreateInput;
  }
}
