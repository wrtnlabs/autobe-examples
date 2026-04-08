import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_platform_timesheet } from "../prepare/prepare_random_hrm_platform_timesheet";

/**
 * Generate a random HRM platform timesheet via the API for E2E testing.
 *
 * Creates a timesheet record in draft status for the authenticated employee. The timesheet
 * is created with a random week_start_date (Monday) and automatically includes all timelogs
 * belonging to the employee within the specified week period. The week_end_date is
 * automatically calculated as week_start_date + 6 days.
 *
 * Uses the prepare function to generate test data, allowing optional customization through
 * the body parameter. The employee_id is automatically derived from the authenticated user's
 * context, and the timesheet is created in draft status.
 *
 * @param connection API connection information
 * @param props Optional parameters for customization
 * @param props.body Optional partial timesheet creation data for test-time customization
 * @returns The newly created timesheet entity in draft status
 */
export async function generate_random_hrm_platform_member_timesheets_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmPlatformTimesheet.ICreate>;
  },
): Promise<IHrmPlatformTimesheet> {
  const prepared: IHrmPlatformTimesheet.ICreate =
    prepare_random_hrm_platform_timesheet(props.body);
  const result: IHrmPlatformTimesheet =
    await api.functional.hrmPlatform.member.timesheets.create(connection, {
      body: prepared,
    });
  return result;
}
