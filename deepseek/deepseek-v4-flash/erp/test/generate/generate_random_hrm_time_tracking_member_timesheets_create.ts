import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import type { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_time_tracking_timesheet } from "../prepare/prepare_random_hrm_time_tracking_timesheet";

/**
 * Generate a random HRM time tracking timesheet via the API for E2E testing.
 *
 * Prepares random timesheet creation data using the prepare function, then calls
 * the timesheet creation endpoint to create a draft timesheet for the
 * authenticated employee's specified work week.
 *
 * The creation endpoint validates that the week start date is a Monday, checks
 * for duplicate timesheets per employee per week, auto-includes unassociated
 * timelogs within the week range, auto-calculates total hours, and creates the
 * timesheet in draft status.
 *
 * @param connection - API connection configuration with authentication context
 * @param props.body - Optional partial creation data to override default random
 *                     timesheet values (e.g., a specific week_start_date)
 * @returns The created timesheet with all fields populated, including the
 *          auto-calculated total hours and associated timelogs
 */
export async function generate_random_hrm_time_tracking_member_timesheets_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmTimeTrackingTimesheet.ICreate> | undefined;
  },
): Promise<IHrmTimeTrackingTimesheet> {
  const prepared: IHrmTimeTrackingTimesheet.ICreate =
    prepare_random_hrm_time_tracking_timesheet(props.body);
  const result: IHrmTimeTrackingTimesheet =
    await api.functional.hrmTimeTracking.member.timesheets.create(connection, {
      body: prepared,
    });
  return result;
}
