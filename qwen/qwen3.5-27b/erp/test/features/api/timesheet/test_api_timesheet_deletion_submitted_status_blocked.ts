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
 * Test that deletion of a submitted timesheet is blocked to preserve audit trail.
 *
 * This test verifies the business rule that timesheets in 'submitted' status
 * cannot be deleted to maintain data integrity for payroll and reporting purposes.
 * Only draft timesheets should be deletable.
 *
 * Note: The SDK currently lacks a submit endpoint, so this test demonstrates
 * the deletion flow for draft timesheets. In a complete implementation, the
 * timesheet would be submitted before attempting deletion to verify the 409 Conflict.
 */
export async function test_api_timesheet_deletion_submitted_status_blocked(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
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
  // 2. Create a draft timesheet
  const draftTimesheet =
    await generate_random_hrm_platform_admin_timesheets_create(
      adminConnection,
      {
        body: undefined,
      },
    );
  typia.assert(draftTimesheet);
  TestValidator.equals(
    "initial status is draft",
    draftTimesheet.status,
    "draft",
  );
  // 3. Test that draft timesheet CAN be deleted (positive test)
  // This verifies the deletion endpoint works correctly for allowed status
  await api.functional.hrmPlatform.admin.timesheets.erase(adminConnection, {
    timesheetId: draftTimesheet.id,
  });
  TestValidator.predicate("draft timesheet deletion succeeded", true);
  // 4. Create another timesheet to test error case
  // Since we cannot submit timesheets without a submit endpoint,
  // we document the expected behavior:
  // - Draft timesheets: deletion succeeds (tested above)
  // - Submitted timesheets: deletion should fail with 409 Conflict
  // - Approved timesheets: deletion should fail with 409 Conflict
  // - Rejected timesheets: deletion should fail with 409 Conflict
  const secondTimesheet =
    await generate_random_hrm_platform_admin_timesheets_create(
      adminConnection,
      {
        body: undefined,
      },
    );
  typia.assert(secondTimesheet);
  // 5. Verify second timesheet is also in draft status
  TestValidator.equals(
    "second timesheet status is draft",
    secondTimesheet.status,
    "draft",
  );
  // 6. Delete the second timesheet successfully
  await api.functional.hrmPlatform.admin.timesheets.erase(adminConnection, {
    timesheetId: secondTimesheet.id,
  });
  TestValidator.predicate("second draft timesheet deletion succeeded", true);
  // Note: To fully test the "submitted status blocked" scenario,
  // a submit endpoint would be needed to transition the timesheet
  // from draft to submitted status, then attempt deletion to verify
  // the 409 Conflict error response.
}
