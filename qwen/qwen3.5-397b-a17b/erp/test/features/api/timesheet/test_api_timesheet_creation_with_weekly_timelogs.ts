import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { generate_random_hrm_platform_member_timesheets_create } from "../../../generate/generate_random_hrm_platform_member_timesheets_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";
import { prepare_random_hrm_platform_timesheet } from "../../../prepare/prepare_random_hrm_platform_timesheet";

/**
 * Test timesheet creation with automatic weekly timelog association.
 *
 * Validates the complete timesheet creation flow including member authentication, organization setup, timelog creation within a specific week, and timesheet generation with automatic timelog association. Ensures that all timelogs within the week period (Monday to Sunday) are correctly associated with the new timesheet.
 *
 * Special attention is given to verifying that the week boundaries are correctly calculated, all timelogs are included in the timesheet, and the total hours are accurately computed from the associated timelogs.
 *
 * 1. Member registers and authenticates with the platform.
 * 2. Member creates an organization to establish employee context.
 * 3. Multiple timelogs are created within a specific week period (Monday-Sunday).
 * 4. Timesheet is created with week_start_date set to the Monday of that week.
 * 5. Validates timesheet status is 'draft'.
 * 6. Validates all timelogs from the week are associated with the timesheet.
 * 7. Validates week_end_date is correctly calculated as week_start_date + 6 days.
 * 8. Validates total hours are correctly computed from associated timelogs.
 */
export async function test_api_timesheet_creation_with_weekly_timelogs(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create organization for employee context
  const orgConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: memberAuth.token.access },
  };
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      orgConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 3. Calculate a specific week period (Monday to Sunday)
  // Use a fixed Monday date for testing
  const mondayDate = new Date("2024-01-08T00:00:00Z"); // Monday
  const tuesdayDate = new Date("2024-01-09T00:00:00Z"); // Tuesday
  const wednesdayDate = new Date("2024-01-10T00:00:00Z"); // Wednesday
  const weekStartDate = mondayDate.toISOString().split("T")[0]; // "2024-01-08"
  // Generate a project ID for timelogs
  const projectId = typia.random<string & tags.Format<"uuid">>();
  // 4. Create multiple timelogs within the week
  const timelog1 = await generate_random_hrm_platform_member_timelogs_create(
    orgConnection,
    {
      body: {
        hrm_platform_project_id: projectId,
        date: mondayDate.toISOString(),
        duration_minutes: 480, // 8 hours
        billable: true,
        description: "Monday work",
      } satisfies IHrmPlatformTimelog.ICreate,
    },
  );
  typia.assert(timelog1);
  const timelog2 = await generate_random_hrm_platform_member_timelogs_create(
    orgConnection,
    {
      body: {
        hrm_platform_project_id: projectId,
        date: tuesdayDate.toISOString(),
        duration_minutes: 360, // 6 hours
        billable: true,
        description: "Tuesday work",
      } satisfies IHrmPlatformTimelog.ICreate,
    },
  );
  typia.assert(timelog2);
  const timelog3 = await generate_random_hrm_platform_member_timelogs_create(
    orgConnection,
    {
      body: {
        hrm_platform_project_id: projectId,
        date: wednesdayDate.toISOString(),
        duration_minutes: 420, // 7 hours
        billable: false,
        description: "Wednesday work",
      } satisfies IHrmPlatformTimelog.ICreate,
    },
  );
  typia.assert(timelog3);
  // 5. Create timesheet with week_start_date as Monday
  const timesheet = await api.functional.hrmPlatform.member.timesheets.create(
    orgConnection,
    {
      body: {
        week_start_date: weekStartDate,
      } satisfies IHrmPlatformTimesheet.ICreate,
    },
  );
  typia.assert(timesheet);
  // 6. Validate timesheet status is 'draft'
  TestValidator.equals("timesheet status", timesheet.status, "draft");
  // 7. Validate week_end_date is correctly calculated (Monday + 6 days = Sunday)
  const expectedEndDate = new Date(mondayDate);
  expectedEndDate.setDate(expectedEndDate.getDate() + 6);
  const expectedEndDateStr = expectedEndDate.toISOString().split("T")[0];
  const actualEndDateStr = timesheet.weekEndDate.split("T")[0];
  TestValidator.equals("week end date", actualEndDateStr, expectedEndDateStr);
  // 8. Validate all timelogs are associated with the timesheet
  TestValidator.predicate(
    "all timelogs associated",
    () => timesheet.timelogs.length === 3,
  );
  // 9. Validate timelog IDs are included
  const timelogIds = timesheet.timelogs.map((t) => t.id);
  TestValidator.predicate("timelog1 included", () =>
    timelogIds.includes(timelog1.id),
  );
  TestValidator.predicate("timelog2 included", () =>
    timelogIds.includes(timelog2.id),
  );
  TestValidator.predicate("timelog3 included", () =>
    timelogIds.includes(timelog3.id),
  );
  // 10. Validate total hours calculation from timelogs (480 + 360 + 420 = 1260 minutes = 21 hours)
  const totalMinutes = timesheet.timelogs.reduce(
    (sum, timelog) => sum + timelog.durationMinutes,
    0,
  );
  const expectedTotalMinutes = 480 + 360 + 420;
  TestValidator.equals("total minutes", totalMinutes, expectedTotalMinutes);
  // 11. Validate employee reference exists
  TestValidator.predicate(
    "employee exists",
    () => timesheet.employee !== null && timesheet.employee !== undefined,
  );
  // 12. Validate reviewer is null for draft timesheet
  TestValidator.equals("reviewer is null", timesheet.reviewer, null);
}