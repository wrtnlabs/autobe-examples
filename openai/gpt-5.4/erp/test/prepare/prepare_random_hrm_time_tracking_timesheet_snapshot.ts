import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingTimesheetSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheetSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_hrm_time_tracking_timesheet_snapshot(
  input?: DeepPartial<IHrmTimeTrackingTimesheetSnapshot.ICreate>,
): IHrmTimeTrackingTimesheetSnapshot.ICreate {
  return {
    locked: input?.locked ?? typia.random<boolean>(),
  };
}
