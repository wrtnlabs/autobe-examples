import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_hrm_platform_admin_timesheets_create } from "../../../generate/generate_random_hrm_platform_admin_timesheets_create";
import { prepare_random_hrm_platform_timesheet } from "../../../prepare/prepare_random_hrm_platform_timesheet";

/**
 * Test that an authenticated admin can create a draft timesheet for a week with no timelogs.
 * Validates the edge case where a timesheet is created but contains no time entries.
 * 1. Authenticate as admin using join endpoint
 * 2. Create a timesheet with week_start_date set to a past Monday where no timelogs exist
 * 3. Verify the response returns a complete timesheet object with correct structure
 * 4. Verify empty draft timesheet is created successfully with total_hours = 0
 */
export async function test_api_timesheet_create_draft_empty_week(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformAdmin.IJoin,
  });
  // 2. Calculate a past Monday date (7 days ago, adjusted to Monday)
  const now = new Date();
  const daysSinceMonday = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const pastMonday = new Date(
    now.getTime() - (daysSinceMonday + 7) * 24 * 60 * 60 * 1000,
  );
  const weekStartDate = pastMonday.toISOString();
  // 3. Create timesheet for empty week
  const timesheet = await generate_random_hrm_platform_admin_timesheets_create(
    adminConnection,
    {
      body: {
        week_start_date: weekStartDate,
      } satisfies IHrmPlatformTimesheet.ICreate,
    },
  );
  // 4. Validate response structure
  typia.assert(timesheet);
  // 5. Verify timesheet properties
  TestValidator.equals("status is draft", timesheet.status, "draft");
  TestValidator.equals("total hours is 0", timesheet.total_hours, 0);
  TestValidator.equals(
    "week_start_date matches input",
    timesheet.week_start_date,
    weekStartDate,
  );
  TestValidator.predicate(
    "has employee info",
    timesheet.employee !== null && timesheet.employee !== undefined,
  );
  TestValidator.equals("submitted_at is null", timesheet.submitted_at, null);
  TestValidator.equals("approved_at is null", timesheet.approved_at, null);
  TestValidator.equals("rejected_at is null", timesheet.rejected_at, null);
  TestValidator.equals("approver is null", timesheet.approver, null);
  TestValidator.equals(
    "rejection_reason is null",
    timesheet.rejection_reason,
    null,
  );
  TestValidator.predicate(
    "has valid ID",
    /^[0-9a-f-]{36}$/i.test(timesheet.id),
  );
  TestValidator.predicate(
    "has created_at",
    timesheet.created_at !== null && timesheet.created_at !== undefined,
  );
  TestValidator.predicate(
    "has updated_at",
    timesheet.updated_at !== null && timesheet.updated_at !== undefined,
  );
}
