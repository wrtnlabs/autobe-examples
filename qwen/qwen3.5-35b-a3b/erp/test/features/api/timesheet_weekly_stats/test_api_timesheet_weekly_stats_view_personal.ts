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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformTimesheetWeeklyStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimesheetWeeklyStat";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_timesheet_weekly_stats_view_personal(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
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
  // 2. Fetch timesheet weekly statistics (memberConnection now has token in headers)
  const response =
    await api.functional.hrmPlatform.member.timesheet_weekly_stats.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(response);
  // 3. Validate pagination structure
  TestValidator.equals(
    "pagination exists",
    response.pagination !== undefined,
    true,
  );
  TestValidator.equals("current page", response.pagination.current >= 1, true);
  TestValidator.equals("limit", response.pagination.limit >= 1, true);
  TestValidator.equals("records count", response.pagination.records >= 0, true);
  TestValidator.equals("pages count", response.pagination.pages >= 0, true);
  // 4. Validate data array
  TestValidator.equals("data is array", Array.isArray(response.data), true);
  // 5. Validate each record structure (if any records exist)
  for (const record of response.data) {
    // Validate organization reference
    TestValidator.equals(
      "organization exists",
      record.organization !== undefined,
      true,
    );
    TestValidator.equals(
      "organization id",
      record.organization.id !== undefined,
      true,
    );
    TestValidator.equals(
      "organization name",
      record.organization.name !== undefined,
      true,
    );
    // Validate employee reference
    TestValidator.equals(
      "employee exists",
      record.employee !== undefined,
      true,
    );
    TestValidator.equals("employee id", record.employee.id !== undefined, true);
    TestValidator.equals(
      "employee code",
      record.employee.employee_code !== undefined,
      true,
    );
    // Validate week dates
    TestValidator.equals(
      "week_start exists",
      record.week_start !== undefined,
      true,
    );
    TestValidator.equals(
      "week_end exists",
      record.week_end !== undefined,
      true,
    );
    // Validate week_end is 6 days after week_start
    const weekStart = new Date(record.week_start);
    const weekEnd = new Date(record.week_end);
    const expectedEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
    TestValidator.equals(
      "week_end is 6 days after week_start",
      weekEnd.toISOString().split("T")[0],
      expectedEnd.toISOString().split("T")[0],
    );
    // Validate timesheet count is non-negative
    TestValidator.equals(
      "timesheet_count is non-negative",
      record.timesheet_count >= 0,
      true,
    );
    // Validate total_hours is non-negative
    TestValidator.equals(
      "total_hours is non-negative",
      record.total_hours >= 0,
      true,
    );
    // Validate billable_hours is non-negative
    TestValidator.equals(
      "billable_hours is non-negative",
      record.billable_hours >= 0,
      true,
    );
    // Validate billable_hours <= total_hours
    TestValidator.equals(
      "billable_hours <= total_hours",
      record.billable_hours <= record.total_hours,
      true,
    );
    // Validate status counts are non-negative
    TestValidator.equals(
      "draft_timesheet_count is non-negative",
      record.draft_timesheet_count >= 0,
      true,
    );
    TestValidator.equals(
      "submitted_timesheet_count is non-negative",
      record.submitted_timesheet_count >= 0,
      true,
    );
    TestValidator.equals(
      "approved_timesheet_count is non-negative",
      record.approved_timesheet_count >= 0,
      true,
    );
    TestValidator.equals(
      "rejected_timesheet_count is non-negative",
      record.rejected_timesheet_count >= 0,
      true,
    );
    // Validate last_refreshed_at exists
    TestValidator.equals(
      "last_refreshed_at exists",
      record.last_refreshed_at !== undefined,
      true,
    );
    // Validate total timesheets equals sum of status counts
    TestValidator.equals(
      "timesheet_count equals sum of status counts",
      record.timesheet_count,
      record.draft_timesheet_count +
        record.submitted_timesheet_count +
        record.approved_timesheet_count +
        record.rejected_timesheet_count,
    );
  }
}
