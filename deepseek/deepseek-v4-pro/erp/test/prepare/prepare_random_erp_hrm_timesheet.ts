import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random ERP HRM timesheet creation data for E2E testing.
 *
 * Generates a complete IErpHrmTimesheet.ICreate with a randomized
 * week_start_date value. The date follows ISO 8601 date-time format.
 *
 * The server enforces that week_start_date must be a Monday at runtime,
 * so test authors should override this value with a valid Monday date
 * when testing submission flows. For draft creation and general testing,
 * the default typia-generated date-time is sufficient.
 */
export function prepare_random_erp_hrm_timesheet(
  input?: DeepPartial<IErpHrmTimesheet.ICreate>,
): IErpHrmTimesheet.ICreate {
  return {
    week_start_date:
      input?.week_start_date ??
      typia.random<string & tags.Format<"date-time">>(),
  };
}
