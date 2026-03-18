import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingTimesheetVersioningLock } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimesheetVersioningLock";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ErpHrmTimeTrackingTimesheetVersioningLockCollector {
  export async function collect(props: {
    body: IErpHrmTimeTrackingTimesheetVersioningLock.ICreate;
  }) {
    const id: string = v4();
    const now: Date = new Date();
    return {
      id,
      locked_by_user_id: props.body.locked_by_user_id,
      lock_reason: props.body.lock_reason,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      timesheet: {
        connect: { id: props.body.timesheet_id },
      },
    } satisfies Prisma.erp_hrm_time_tracking_timesheet_versioning_locksCreateInput;
  }
}
