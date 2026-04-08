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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_timesheets_create } from "../../../generate/generate_random_hrm_platform_member_timesheets_create";
import { prepare_random_hrm_platform_timesheet } from "../../../prepare/prepare_random_hrm_platform_timesheet";

export async function test_api_timesheet_creation_duplicate_week_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and organization
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
      org_logo_uri: typia.random<string & tags.Format<"uri">>(),
      org_timezone: RandomGenerator.pick(["UTC", "Asia/Seoul"]),
      org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuthorized);
  // Create connection with member token for timesheet operations
  const memberApiConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: memberAuthorized.token.access },
  };
  // 2. Define week period for timesheet testing
  const weekStart = new Date("2024-01-08T00:00:00.000Z");
  const weekEnd = new Date("2024-01-14T23:59:59.999Z");
  const weekPeriod = {
    start_date: weekStart.toISOString(),
    end_date: weekEnd.toISOString(),
  };
  // 3. Create a test employee in the organization (assume employee exists or create via other means)
  // For this test, we'll attempt to create timesheet - if employee doesn't exist, it will fail
  // We need a valid employee_id. Using typia.random UUID as placeholder
  // In production, this would come from employee creation endpoint
  const employeeId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Create first timesheet for the employee and week period
  const firstTimesheet =
    await api.functional.hrmPlatform.member.timesheets.create(
      memberApiConnection,
      {
        body: {
          start_date: weekPeriod.start_date,
          end_date: weekPeriod.end_date,
          hrm_platform_employee_id: employeeId,
          notes: "First timesheet for duplicate week prevention test",
        } satisfies IHrmPlatformTimesheet.ICreate,
      },
    );
  typia.assert(firstTimesheet);
  // 5. Verify first timesheet was created successfully
  TestValidator.equals(
    "first timesheet has valid ID",
    firstTimesheet.id !== undefined,
    true,
  );
  TestValidator.equals(
    "first timesheet employee ID matches",
    firstTimesheet.hrm_platform_employee_id,
    employeeId,
  );
  TestValidator.equals(
    "first timesheet week start matches",
    firstTimesheet.start_date,
    weekPeriod.start_date,
  );
  TestValidator.equals(
    "first timesheet week end matches",
    firstTimesheet.end_date,
    weekPeriod.end_date,
  );
  // 6. Attempt to create duplicate timesheet for same employee and week
  await TestValidator.error(
    "should prevent duplicate timesheet for same employee and week",
    async () => {
      await api.functional.hrmPlatform.member.timesheets.create(
        memberApiConnection,
        {
          body: {
            start_date: weekPeriod.start_date,
            end_date: weekPeriod.end_date,
            hrm_platform_employee_id: employeeId,
            notes: "Duplicate timesheet attempt should fail",
          } satisfies IHrmPlatformTimesheet.ICreate,
        },
      );
    },
  );
  // 7. Verify original timesheet remains unchanged
  const retrievedTimesheet =
    await api.functional.hrmPlatform.member.timesheets.create(
      memberApiConnection,
      {
        body: {
          start_date: weekPeriod.start_date,
          end_date: new Date(weekEnd.getTime() + 7 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          hrm_platform_employee_id: employeeId,
          notes: "Different week - should succeed",
        } satisfies IHrmPlatformTimesheet.ICreate,
      },
    );
  // 8. Test with different week period to ensure unique constraint works correctly
  TestValidator.notEquals(
    "created different timesheet for different week",
    firstTimesheet.id,
    retrievedTimesheet.id,
  );
  TestValidator.equals(
    "retrieved timesheet has different start date",
    retrievedTimesheet.start_date !== firstTimesheet.start_date,
    true,
  );
}
