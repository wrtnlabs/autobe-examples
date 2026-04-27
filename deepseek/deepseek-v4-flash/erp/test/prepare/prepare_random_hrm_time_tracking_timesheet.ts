import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random HRM time tracking timesheet creation data for E2E testing.
 *
 * Generates a complete {@link IHrmTimeTrackingTimesheet.ICreate} with a
 * randomized Monday week start date.
 *
 * The only required field is `week_start_date`, which must be an ISO date
 * string representing a Monday. If a partial input object is provided, the
 * function uses the provided date (if any) or generates a new random date
 * string as a fallback.
 *
 * @param input - Partial creation data to override default random values
 * @returns A fully populated {@link IHrmTimeTrackingTimesheet.ICreate} object
 */
export function prepare_random_hrm_time_tracking_timesheet(
  input?: DeepPartial<IHrmTimeTrackingTimesheet.ICreate> | undefined,
): IHrmTimeTrackingTimesheet.ICreate {
  return {
    week_start_date:
      input?.week_start_date ?? typia.random<string & tags.Format<"date">>(),
  };
}
