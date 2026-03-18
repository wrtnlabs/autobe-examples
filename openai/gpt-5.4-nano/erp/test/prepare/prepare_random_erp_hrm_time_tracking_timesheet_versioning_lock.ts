import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingTimesheetVersioningLock } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimesheetVersioningLock";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_erp_hrm_time_tracking_timesheet_versioning_lock(
  input?:
    | DeepPartial<IErpHrmTimeTrackingTimesheetVersioningLock.ICreate>
    | undefined,
): IErpHrmTimeTrackingTimesheetVersioningLock.ICreate {
  return {
    timesheet_id:
      input?.timesheet_id ?? typia.random<string & tags.Format<"uuid">>(),
    locked_by_user_id:
      input?.locked_by_user_id ?? typia.random<string & tags.Format<"uuid">>(),
    lock_reason:
      input?.lock_reason ?? RandomGenerator.paragraph({ sentences: 2 }),
  };
}
