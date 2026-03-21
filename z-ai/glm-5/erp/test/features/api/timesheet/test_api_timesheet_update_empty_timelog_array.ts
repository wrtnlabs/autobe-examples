import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

/**
 * Test updating a draft timesheet with an empty timelog array.
 *
 * Business Rule: Draft timesheets can be updated with empty timelog arrays.
 * This allows work-in-progress scenarios where employees can create timesheets
 * before adding time entries. However, such timesheets cannot be submitted
 * for approval until at least one timelog is added.
 *
 * Setup: Authenticate as member, create project, create draft timesheet.
 * Execution: Update timesheet with empty timelog_ids array.
 * Validation: Verify response has status='draft', total_hours=0, empty timelogs.
 */
export async function test_api_timesheet_update_empty_timelog_array(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // Step 2: Create a project (satisfies timelog prerequisite, not used in this scenario)
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // Step 3: Create a draft timesheet for a work week (Monday)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - daysToMonday);
  monday.setHours(0, 0, 0, 0);
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    memberConnection,
    {
      body: {
        week_start_date: monday.toISOString(),
      },
    },
  );
  typia.assert(timesheet);
  // Verify initial timesheet is in draft status
  TestValidator.equals("timesheet initial status", timesheet.status, "draft");
  // Step 4: Update timesheet with empty timelog_ids array
  const updatedTimesheet = await api.functional.erpHrm.member.timesheets.update(
    memberConnection,
    {
      timesheetId: timesheet.id,
      body: {
        timelog_ids: [],
      } satisfies IErpHrmTimesheet.IUpdate,
    },
  );
  typia.assert(updatedTimesheet);
  // Step 5: Validate the response
  TestValidator.equals(
    "timesheet id unchanged",
    updatedTimesheet.id,
    timesheet.id,
  );
  TestValidator.equals(
    "status remains draft",
    updatedTimesheet.status,
    "draft",
  );
  TestValidator.equals("total_hours is 0", updatedTimesheet.total_hours, 0);
  TestValidator.predicate(
    "timelogs array is empty",
    updatedTimesheet.timelogs.length === 0,
  );
}
