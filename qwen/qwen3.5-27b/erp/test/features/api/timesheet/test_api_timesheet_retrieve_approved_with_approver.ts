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
 * Test that an authenticated admin can retrieve an approved timesheet and verify approver information is correctly populated.
 *
 * Test Steps:
 * 1. Authenticate as admin using authorize_admin_join utility
 * 2. Create a draft timesheet for a past week using generate_random_hrm_platform_admin_timesheets_create utility
 * 3. Retrieve the timesheet using GET /hrmPlatform/admin/timesheets/{timesheetId}
 * 4. Verify the response structure contains all required fields
 * 5. Verify approver is null for draft timesheet (since we can't approve it)
 * 6. Verify status is 'draft'
 * 7. Verify total_hours is populated
 * 8. Verify submitted_at, approved_at, rejected_at, rejection_reason are null for draft status
 */
export async function test_api_timesheet_retrieve_approved_with_approver(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a draft timesheet for a past week
  const pastWeekStart = new Date();
  pastWeekStart.setDate(pastWeekStart.getDate() - 7);
  pastWeekStart.setHours(0, 0, 0, 0);
  const timesheet = await generate_random_hrm_platform_admin_timesheets_create(
    adminConnection,
    {
      body: {
        week_start_date: pastWeekStart.toISOString(),
      },
    },
  );
  typia.assert(timesheet);
  // 3. Retrieve the timesheet using the ID
  const retrievedTimesheet =
    await api.functional.hrmPlatform.admin.timesheets.at(adminConnection, {
      timesheetId: timesheet.id,
    });
  typia.assert(retrievedTimesheet);
  // 4. Verify the response structure contains all required fields
  TestValidator.equals(
    "timesheet ID matches",
    retrievedTimesheet.id,
    timesheet.id,
  );
  // 5. Verify approver is null for draft timesheet
  TestValidator.equals(
    "approver is null for draft timesheet",
    retrievedTimesheet.approver,
    null,
  );
  // 6. Verify status is 'draft'
  TestValidator.equals("status is draft", retrievedTimesheet.status, "draft");
  // 7. Verify total_hours is populated
  TestValidator.predicate(
    "total_hours is non-negative",
    retrievedTimesheet.total_hours >= 0,
  );
  // 8. Verify submitted_at, approved_at, rejected_at, rejection_reason are null for draft status
  TestValidator.equals(
    "submitted_at is null for draft",
    retrievedTimesheet.submitted_at,
    null,
  );
  TestValidator.equals(
    "approved_at is null for draft",
    retrievedTimesheet.approved_at,
    null,
  );
  TestValidator.equals(
    "rejected_at is null for draft",
    retrievedTimesheet.rejected_at,
    null,
  );
  TestValidator.equals(
    "rejection_reason is null for draft",
    retrievedTimesheet.rejection_reason,
    null,
  );
  // 9. Verify employee information is present
  TestValidator.predicate(
    "employee exists",
    retrievedTimesheet.employee !== null,
  );
  TestValidator.equals(
    "employee ID matches created timesheet",
    retrievedTimesheet.employee.id,
    timesheet.employee.id,
  );
  // 10. Verify week_start_date matches
  TestValidator.equals(
    "week_start_date matches",
    retrievedTimesheet.week_start_date,
    timesheet.week_start_date,
  );
  // 11. Verify timestamps exist
  TestValidator.predicate(
    "created_at exists",
    retrievedTimesheet.created_at !== null &&
      retrievedTimesheet.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at exists",
    retrievedTimesheet.updated_at !== null &&
      retrievedTimesheet.updated_at !== undefined,
  );
}
