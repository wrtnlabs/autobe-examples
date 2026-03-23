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
 * Test that an authenticated admin can retrieve a timesheet in draft status by its unique identifier.
 *
 * This test validates the complete draft timesheet retrieval workflow:
 * 1. Admin authentication
 * 2. Draft timesheet creation
 * 3. Timesheet retrieval by ID
 * 4. Verification of draft-specific fields (null approver, null timestamps, status = 'draft')
 */
export async function test_api_timesheet_retrieve_draft_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a draft timesheet for the current week
  const createdTimesheet =
    await generate_random_hrm_platform_admin_timesheets_create(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(createdTimesheet);
  // 3. Retrieve the created timesheet by ID
  const retrievedTimesheet =
    await api.functional.hrmPlatform.admin.timesheets.at(adminConnection, {
      timesheetId: createdTimesheet.id,
    });
  typia.assert(retrievedTimesheet);
  // 4. Verify the retrieved timesheet matches the created one
  TestValidator.equals(
    "timesheet ID matches",
    retrievedTimesheet.id,
    createdTimesheet.id,
  );
  // 5. Verify status is 'draft'
  TestValidator.equals("status is draft", retrievedTimesheet.status, "draft");
  // 6. Verify employee information is present
  TestValidator.predicate(
    "employee exists",
    retrievedTimesheet.employee !== null,
  );
  TestValidator.predicate(
    "employee has member",
    retrievedTimesheet.employee.member !== null,
  );
  TestValidator.predicate(
    "employee has role",
    retrievedTimesheet.employee.role !== null,
  );
  // 7. Verify approver is null for draft timesheet
  TestValidator.equals(
    "approver is null for draft",
    retrievedTimesheet.approver,
    null,
  );
  // 8. Verify total_hours is a valid number
  TestValidator.predicate(
    "total_hours is non-negative",
    retrievedTimesheet.total_hours >= 0,
  );
  // 9. Verify all approval workflow timestamps are null
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
  // 10. Verify rejection_reason is null
  TestValidator.equals(
    "rejection_reason is null for draft",
    retrievedTimesheet.rejection_reason,
    null,
  );
  // 11. Verify week_start_date is present and valid
  TestValidator.predicate(
    "week_start_date exists",
    retrievedTimesheet.week_start_date !== null &&
      retrievedTimesheet.week_start_date !== undefined,
  );
  // 12. Verify created_at and updated_at timestamps exist
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
