import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import type { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import type { IHrmsTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimesheet";
import type { IWeekRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IWeekRange";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrms_member_organizations_employees_timelogs_create } from "../../../generate/generate_random_hrms_member_organizations_employees_timelogs_create";
import { generate_random_hrms_member_timesheets_create } from "../../../generate/generate_random_hrms_member_timesheets_create";
import { prepare_random_hrms_timelog } from "../../../prepare/prepare_random_hrms_timelog";
import { prepare_random_hrms_timesheet } from "../../../prepare/prepare_random_hrms_timesheet";

export async function test_api_timesheet_submission_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register and authenticate as employee member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(authorized);
  // Extract organization_id from member's organization membership
  const organizationId = authorized.organization_memberships[0].organization.id;
  // Extract employee_id (same as member_id for this context)
  const employeeId = authorized.id;
  // Step 2: Create draft timesheet for a specific week (current week)
  const currentWeek = typia.random<IWeekRange>();
  const weekStartDateTime = `${currentWeek.start_date}T00:00:00+09:00`;
  const weekEndDateTime = `${currentWeek.end_date}T23:59:59+09:00`;
  const draftTimesheet = await api.functional.hrms.member.timesheets.create(
    memberConnection,
    {
      body: {
        week_start_date: weekStartDateTime,
      } satisfies IHrmsTimesheet.ICreate,
    },
  );
  typia.assert(draftTimesheet);
  // Validate timesheet is in draft status
  TestValidator.equals(
    "timesheet initial status is draft",
    draftTimesheet.status,
    "draft",
  );
  TestValidator.equals(
    "timesheet is draft (submitted_at is null)",
    draftTimesheet.submitted_at,
    null,
  );
  // Step 3: Create at least one timelog entry within the timesheet's week range
  const workDate = currentWeek.start_date; // Use Monday's date
  const durationMinutes = 480; // 8 hours in minutes
  const timelog =
    await api.functional.hrms.member.organizations.employees.timelogs.create(
      memberConnection,
      {
        organizationId,
        employeeId,
        body: {
          date: `${workDate}T00:00:00+09:00`,
          duration_minutes: durationMinutes,
          project_id: typia.random<string & tags.Format<"uuid">>(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          billable: true,
        } satisfies IHrmsTimelog.ICreate,
      },
    );
  typia.assert(timelog);
  // Step 4: Submit the draft timesheet for approval
  const submittedTimesheet = await api.functional.hrms.member.timesheets.submit(
    memberConnection,
    {
      timesheetId: draftTimesheet.id,
    },
  );
  typia.assert(submittedTimesheet);
  // Step 5: Validate submission results
  // Status should be 'submitted'
  TestValidator.equals(
    "timesheet status is submitted",
    submittedTimesheet.status,
    "submitted",
  );
  // submitted_at should be set
  TestValidator.predicate(
    "submitted_at timestamp is set",
    () => submittedTimesheet.submitted_at !== null,
  );
  // timelogs should include the created timelog
  TestValidator.equals(
    "timelogs count matches created timelog",
    submittedTimesheet.timelogs.length,
    1,
  );
  // total_hours should reflect the timelog duration
  const expectedTotalHours = durationMinutes / 60;
  TestValidator.equals(
    "total hours equals timelog duration in hours",
    submittedTimesheet.total_hours,
    expectedTotalHours,
  );
}