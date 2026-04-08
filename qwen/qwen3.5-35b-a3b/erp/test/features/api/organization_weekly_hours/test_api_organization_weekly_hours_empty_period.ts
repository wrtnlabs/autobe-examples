import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTimesheetWeeklyStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheetWeeklyStat";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_organization_weekly_hours_empty_period(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new member, which creates an organization
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
    },
  });
  typia.assert(memberAuth);
  // 2. Verify the organization context is available in the member's sessions
  const organization = memberAuth.sessions?.[0]?.organization;
  TestValidator.predicate(
    "organization exists in session",
    organization !== null && organization !== undefined,
  );
  typia.assert(organization!);
  // 3. Call the organization-weekly-hours endpoint (no timelogs exist yet)
  const weeklyStat =
    await api.functional.hrmPlatform.member.timetracking.organization_weekly_hours.at(
      memberConnection,
    );
  typia.assert(weeklyStat);
  // 4. Validate total_hours and billable_hours are zero
  TestValidator.equals(
    "total_hours is zero for empty period",
    weeklyStat.total_hours,
    0.0,
  );
  TestValidator.equals(
    "billable_hours is zero for empty period",
    weeklyStat.billable_hours,
    0.0,
  );
  // 5. Validate all timesheet counts are zero
  TestValidator.equals(
    "timesheet_count is zero for empty period",
    weeklyStat.timesheet_count,
    0,
  );
  TestValidator.equals(
    "draft_timesheet_count is zero for empty period",
    weeklyStat.draft_timesheet_count,
    0,
  );
  TestValidator.equals(
    "submitted_timesheet_count is zero for empty period",
    weeklyStat.submitted_timesheet_count,
    0,
  );
  TestValidator.equals(
    "approved_timesheet_count is zero for empty period",
    weeklyStat.approved_timesheet_count,
    0,
  );
  TestValidator.equals(
    "rejected_timesheet_count is zero for empty period",
    weeklyStat.rejected_timesheet_count,
    0,
  );
  // 6. Validate organization context is preserved
  TestValidator.equals(
    "organization_id matches registered organization",
    weeklyStat.organization.id,
    organization!.id,
  );
  TestValidator.equals(
    "organization name matches registered organization",
    weeklyStat.organization.name,
    organization!.name,
  );
  // 7. Validate week period timestamps are present and valid
  TestValidator.predicate(
    "week_start timestamp is present",
    weeklyStat.week_start !== undefined && weeklyStat.week_start !== null,
  );
  TestValidator.predicate(
    "week_end timestamp is present",
    weeklyStat.week_end !== undefined && weeklyStat.week_end !== null,
  );
  // Parse dates to validate week period makes sense
  const weekStartDate = new Date(weeklyStat.week_start);
  const weekEndDate = new Date(weeklyStat.week_end);
  TestValidator.predicate(
    "week_start is before week_end",
    weekStartDate < weekEndDate,
  );
  const weekDurationDays =
    (weekEndDate.getTime() - weekStartDate.getTime()) / (1000 * 60 * 60 * 24);
  TestValidator.equals(
    "week period is 7 days (Monday to Sunday)",
    weekDurationDays,
    7,
  );
  // 8. Validate last_refreshed_at timestamp is present
  TestValidator.predicate(
    "last_refreshed_at timestamp is present",
    weeklyStat.last_refreshed_at !== undefined &&
      weeklyStat.last_refreshed_at !== null,
  );
  // 9. Validate employee reference is present (even with empty data)
  TestValidator.predicate(
    "employee reference is present",
    weeklyStat.employee !== null && weeklyStat.employee !== undefined,
  );
  typia.assert(weeklyStat.employee!);
}
