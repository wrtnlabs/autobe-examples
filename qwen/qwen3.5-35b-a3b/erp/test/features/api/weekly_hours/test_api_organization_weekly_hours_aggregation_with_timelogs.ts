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

export async function test_api_organization_weekly_hours_aggregation_with_timelogs(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new member (creates organization context)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      avatar_uri: typia.random<string & tags.Format<"uri">>(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph({ sentences: 2 }),
      org_logo_uri: typia.random<string & tags.Format<"uri">>(),
      org_timezone: RandomGenerator.pick([
        "UTC",
        "Asia/Seoul",
        "America/New_York",
      ]),
      org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Call the organization-weekly-hours endpoint using member's authenticated connection
  const weeklyHours =
    await api.functional.hrmPlatform.member.timetracking.organization_weekly_hours.at(
      memberConnection,
    );
  typia.assert(weeklyHours);
  // 3. Validate organization context exists and matches authenticated member's organization
  TestValidator.predicate(
    "organization context present",
    weeklyHours.organization !== null && weeklyHours.organization !== undefined,
  );
  TestValidator.predicate(
    "organization id format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      weeklyHours.organization.id,
    ),
  );
  TestValidator.predicate(
    "organization name present",
    weeklyHours.organization.name !== undefined &&
      weeklyHours.organization.name !== null &&
      weeklyHours.organization.name.length > 0,
  );
  // 4. Validate employee context
  TestValidator.predicate(
    "employee context present",
    weeklyHours.employee !== null && weeklyHours.employee !== undefined,
  );
  TestValidator.predicate(
    "employee id format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      weeklyHours.employee.id,
    ),
  );
  TestValidator.predicate(
    "employee display name present",
    weeklyHours.employee.display_name !== undefined &&
      weeklyHours.employee.display_name !== null &&
      weeklyHours.employee.display_name.length > 0,
  );
  // 5. Validate week period dates
  TestValidator.predicate(
    "week start format",
    !Number.isNaN(Date.parse(weeklyHours.week_start)),
  );
  TestValidator.predicate(
    "week end format",
    !Number.isNaN(Date.parse(weeklyHours.week_end)),
  );
  // 6. Validate timesheet counts are non-negative integers
  TestValidator.predicate(
    "timesheet count is non-negative",
    weeklyHours.timesheet_count >= 0,
  );
  TestValidator.predicate(
    "draft timesheet count is non-negative",
    weeklyHours.draft_timesheet_count >= 0,
  );
  TestValidator.predicate(
    "submitted timesheet count is non-negative",
    weeklyHours.submitted_timesheet_count >= 0,
  );
  TestValidator.predicate(
    "approved timesheet count is non-negative",
    weeklyHours.approved_timesheet_count >= 0,
  );
  TestValidator.predicate(
    "rejected timesheet count is non-negative",
    weeklyHours.rejected_timesheet_count >= 0,
  );
  // 7. Validate hours are non-negative
  TestValidator.predicate(
    "total hours is non-negative",
    weeklyHours.total_hours >= 0,
  );
  TestValidator.predicate(
    "billable hours is non-negative",
    weeklyHours.billable_hours >= 0,
  );
  // 8. Validate last refreshed timestamp format
  TestValidator.predicate(
    "last refreshed at format",
    !Number.isNaN(Date.parse(weeklyHours.last_refreshed_at)),
  );
  // 9. Verify timesheet count breakdown matches total
  const calculatedCount =
    weeklyHours.draft_timesheet_count +
    weeklyHours.submitted_timesheet_count +
    weeklyHours.approved_timesheet_count +
    weeklyHours.rejected_timesheet_count;
  TestValidator.equals(
    "timesheet counts sum to total",
    calculatedCount,
    weeklyHours.timesheet_count,
  );
}