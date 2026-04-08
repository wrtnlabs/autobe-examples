import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random HRM platform timesheet creation data for E2E testing.
 *
 * Generates a complete IHrmPlatformTimesheet.ICreate with randomized values.
 * The week_start_date is generated as a valid date string in YYYY-MM-DD format,
 * representing the Monday that marks the start of the timesheet week.
 *
 * @param input Optional partial input for test-time customization
 * @returns Complete IHrmPlatformTimesheet.ICreate object
 */
export function prepare_random_hrm_platform_timesheet(
  input?: DeepPartial<IHrmPlatformTimesheet.ICreate>,
): IHrmPlatformTimesheet.ICreate {
  return {
    week_start_date:
      input?.week_start_date ?? typia.random<string & tags.Format<"date">>(),
  };
}
