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
import { generate_random_erp_hrm_member_employees_create } from "../../../generate/generate_random_erp_hrm_member_employees_create";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

/**
 * Test business rule that only timesheets in 'submitted' status can be rejected.
 *
 * This test validates the approval workflow integrity by attempting to reject
 * a timesheet that is still in 'draft' status. The system should prevent this
 * operation and return an appropriate error.
 *
 * Steps:
 * 1. Create member (with organization and employee record automatically)
 * 2. Create project for timelogs
 * 3. Create timelog entry
 * 4. Create timesheet (in 'draft' status by default)
 * 5. Attempt to reject the draft timesheet - should fail
 */
export async function test_api_timesheet_rejection_wrong_status(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member with organization and employee record
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // Step 2: Create a project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // Step 3: Create a timelog for the current date
  const now = new Date();
  const timelog = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        date: now.toISOString(),
        duration: 120, // 2 hours
        description: "Test work entry",
        billable: true,
      },
    },
  );
  typia.assert(timelog);
  // Step 4: Create a timesheet for the current week
  // Get the Monday of the current week
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
  // Verify the timesheet is in 'draft' status
  TestValidator.equals(
    "timesheet should be in draft status",
    timesheet.status,
    "draft",
  );
  // Step 5: Attempt to reject the draft timesheet - should fail
  await TestValidator.error("cannot reject draft timesheet", async () => {
    await api.functional.erpHrm.member.timesheets.reject(memberConnection, {
      timesheetId: timesheet.id,
      body: {
        rejection_reason: "This rejection should not be allowed",
      } satisfies IErpHrmTimesheet.IReject,
    });
  });
}
