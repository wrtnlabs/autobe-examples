import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random HRM platform timesheet creation data for E2E testing.
 *
 * Generates a complete IHrmPlatformTimesheet.ICreate with randomized week_start_date
 * representing the Monday start date of the weekly tracking period. The system
 * automatically calculates the week end date (Sunday) and aggregates existing timelogs
 * for the authenticated employee within that week.
 */
export function prepare_random_hrm_platform_timesheet(
  input?: DeepPartial<IHrmPlatformTimesheet.ICreate>,
): IHrmPlatformTimesheet.ICreate {
  return {
    week_start_date:
      input?.week_start_date ??
      typia.random<string & tags.Format<"date-time">>(),
  };
}
