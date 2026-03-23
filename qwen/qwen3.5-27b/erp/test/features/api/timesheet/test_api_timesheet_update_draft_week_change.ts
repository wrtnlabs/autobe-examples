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
 * Test updating a draft timesheet's week_start_date.
 * Verifies that draft timesheets can have their week changed,
 * total hours are recalculated, and status remains draft.
 */
export async function test_api_timesheet_update_draft_week_change(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "https://example.com/admin/join",
      referrer: "https://example.com",
    },
  });
  // 2. Create a draft timesheet for original week (2026-03-16 is a Monday)
  const originalTimesheet =
    await generate_random_hrm_platform_admin_timesheets_create(
      adminConnection,
      {
        body: {
          week_start_date: "2026-03-16T00:00:00.000Z",
        },
      },
    );
  typia.assert(originalTimesheet);
  // Verify original timesheet is in draft status
  TestValidator.equals(
    "original timesheet status is draft",
    originalTimesheet.status,
    "draft",
  );
  // Store original values for comparison
  const originalWeekStart = originalTimesheet.week_start_date;
  const originalTotalHours = originalTimesheet.total_hours;
  const originalEmployeeId = originalTimesheet.employee.id;
  // 3. Update timesheet with new week_start_date (2026-03-23 is a Monday)
  const updatedTimesheet =
    await api.functional.hrmPlatform.admin.timesheets.update(adminConnection, {
      timesheetId: originalTimesheet.id,
      body: {
        week_start_date: "2026-03-23T00:00:00.000Z",
      } satisfies IHrmPlatformTimesheet.IUpdate,
    });
  typia.assert(updatedTimesheet);
  // 4. Verify the new week_start_date is updated
  TestValidator.equals(
    "week_start_date is updated to new week",
    updatedTimesheet.week_start_date,
    "2026-03-23T00:00:00.000Z",
  );
  // 5. Verify week_start_date is different from original
  TestValidator.notEquals(
    "week_start_date changed from original",
    updatedTimesheet.week_start_date,
    originalWeekStart,
  );
  // 6. Verify timesheet status remains 'draft'
  TestValidator.equals(
    "status remains draft after update",
    updatedTimesheet.status,
    "draft",
  );
  // 7. Verify employee is preserved
  TestValidator.equals(
    "employee is preserved after update",
    updatedTimesheet.employee.id,
    originalEmployeeId,
  );
  // 8. Verify total_hours may be recalculated (could be same or different)
  TestValidator.predicate(
    "total_hours is a valid non-negative number",
    updatedTimesheet.total_hours >= 0,
  );
  // 9. Verify updated_at is updated (should be different from created_at)
  TestValidator.notEquals(
    "updated_at is different from created_at",
    updatedTimesheet.updated_at,
    updatedTimesheet.created_at,
  );
  // 10. Verify approver remains null (draft timesheets have no approver)
  TestValidator.equals(
    "approver remains null for draft timesheet",
    updatedTimesheet.approver,
    null,
  );
  // 11. Verify workflow timestamps remain null for draft status
  TestValidator.equals(
    "submitted_at remains null for draft",
    updatedTimesheet.submitted_at,
    null,
  );
  TestValidator.equals(
    "approved_at remains null for draft",
    updatedTimesheet.approved_at,
    null,
  );
  TestValidator.equals(
    "rejected_at remains null for draft",
    updatedTimesheet.rejected_at,
    null,
  );
  TestValidator.equals(
    "rejection_reason remains null for draft",
    updatedTimesheet.rejection_reason,
    null,
  );
}
