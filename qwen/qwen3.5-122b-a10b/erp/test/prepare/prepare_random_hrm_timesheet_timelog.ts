import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimesheetTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random HRM timesheet timelog creation data for E2E testing.
 *
 * Generates a complete IHrmTimesheetTimelog.ICreate with randomized values.
 * The timesheet is created for a specific employee covering a weekly period
 * starting from the specified Monday date.
 *
 * @param input Optional partial input to override specific properties
 * @returns Complete IHrmTimesheetTimelog.ICreate object with all required fields
 */
export function prepare_random_hrm_timesheet_timelog(
  input?: DeepPartial<IHrmTimesheetTimelog.ICreate>,
): IHrmTimesheetTimelog.ICreate {
  return {
    hrm_employee_id:
      input?.hrm_employee_id ?? typia.random<string & tags.Format<"uuid">>(),
    week_start_date:
      input?.week_start_date ??
      typia.random<string & tags.Format<"date-time">>(),
  };
}
