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
 * Test that an authenticated admin can successfully create a draft timesheet for a past calendar week.
 * The test authenticates as admin, calculates a past Monday date, creates a timesheet using the utility function,
 * and validates the response structure including status, employee info, and null workflow fields.
 */
export async function test_api_timesheet_create_draft_with_timelogs(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Calculate a past Monday date (last week) at 00:00:00
  const now = new Date();
  const daysSinceMonday = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const lastMonday = new Date(
    now.getTime() - (daysSinceMonday + 7) * 24 * 60 * 60 * 1000,
  );
  lastMonday.setHours(0, 0, 0, 0);
  const weekStartDate = lastMonday.toISOString();
  // 3. Create timesheet using utility function
  const timesheet = await generate_random_hrm_platform_admin_timesheets_create(
    adminConnection,
    {
      body: {
        week_start_date: weekStartDate,
      },
    },
  );
  // 4. Validate response structure with complete type checking
  typia.assert(timesheet);
  // 5. Verify timesheet business logic properties
  TestValidator.equals("status is draft", timesheet.status, "draft");
  TestValidator.predicate(
    "total_hours is non-negative",
    timesheet.total_hours >= 0,
  );
  TestValidator.equals(
    "week_start_date matches",
    timesheet.week_start_date,
    weekStartDate,
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
}
