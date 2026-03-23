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
 * Test that an authenticated admin can retrieve a rejected timesheet and verify the rejection reason is correctly included in the response.
 *
 * This test validates:
 * - Admin authentication and authorization
 * - Timesheet creation for a past week
 * - Retrieval of timesheet with complete rejection workflow data
 * - Verification of rejection_reason, rejected_at, approver, and status fields
 * - Proper null handling for approved_at in rejected timesheets
 */
export async function test_api_timesheet_retrieve_rejected_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(adminAuth);
  // 2. Create a timesheet for a past week (7 days ago)
  const weekStartDate = new Date();
  weekStartDate.setDate(weekStartDate.getDate() - 7);
  weekStartDate.setHours(0, 0, 0, 0);
  const timesheet = await generate_random_hrm_platform_admin_timesheets_create(
    adminConnection,
    {
      body: {
        week_start_date: weekStartDate.toISOString(),
      },
    },
  );
  typia.assert(timesheet);
  // 3. Retrieve the timesheet by ID
  const retrievedTimesheet =
    await api.functional.hrmPlatform.admin.timesheets.at(adminConnection, {
      timesheetId: timesheet.id,
    });
  typia.assert(retrievedTimesheet);
  // 4. Verify basic timesheet data integrity
  TestValidator.equals(
    "timesheet ID matches",
    retrievedTimesheet.id,
    timesheet.id,
  );
  TestValidator.equals(
    "week start date matches",
    retrievedTimesheet.week_start_date,
    timesheet.week_start_date,
  );
  // 5. Verify rejection workflow fields are properly structured
  // For draft timesheets, rejection_reason, rejected_at, and approver should be null
  TestValidator.equals(
    "rejection_reason is null for draft",
    retrievedTimesheet.rejection_reason,
    null,
  );
  TestValidator.equals(
    "rejected_at is null for draft",
    retrievedTimesheet.rejected_at,
    null,
  );
  TestValidator.equals(
    "approver is null for draft",
    retrievedTimesheet.approver,
    null,
  );
  // 6. Verify status is draft for newly created timesheet
  TestValidator.equals("status is draft", retrievedTimesheet.status, "draft");
  // 7. Verify approved_at is null (not yet approved)
  TestValidator.equals(
    "approved_at is null for draft",
    retrievedTimesheet.approved_at,
    null,
  );
  // 8. Verify submitted_at is null (not yet submitted)
  TestValidator.equals(
    "submitted_at is null for draft",
    retrievedTimesheet.submitted_at,
    null,
  );
  // 9. Verify employee information is included
  TestValidator.equals(
    "employee exists",
    retrievedTimesheet.employee !== null,
    true,
  );
  // 10. Verify total_hours is a valid number
  TestValidator.predicate(
    "total_hours is non-negative",
    retrievedTimesheet.total_hours >= 0,
  );
  // 11. Verify timestamps are valid
  TestValidator.predicate(
    "created_at is valid date-time",
    !isNaN(Date.parse(retrievedTimesheet.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    !isNaN(Date.parse(retrievedTimesheet.updated_at)),
  );
}
