import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random HRM time track timesheet creation data for E2E testing.
 *
 * Generates a complete IHrmTimeTrackTimesheet.ICreate with randomized values.
 * The week_start_date is generated as a valid ISO 8601 date-time string.
 *
 * This function allows partial input customization through DeepPartial,
 * enabling tests to override specific fields while auto-generating others.
 */
export function prepare_random_hrm_time_track_timesheet(
  input?: DeepPartial<IHrmTimeTrackTimesheet.ICreate> | undefined,
): IHrmTimeTrackTimesheet.ICreate {
  return {
    week_start_date:
      input?.week_start_date ??
      typia.random<string & tags.Format<"date-time">>(),
  };
}
